package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/cavaliercoder/grab"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/joho/godotenv"

	"github.com/gocarina/gocsv"
)

type DataPoint struct {
	X time.Time `json:"x"`
	Y int       `json:"y"`
}

type DataComponent struct {
	Count      int         `json:"count"`
	DataPoints []DataPoint `json:"dataPoints"`
}

type Data struct {
	Ativos         *DataComponent `json:"ativos"`
	Confirmados    *DataComponent `json:"confirmados"`
	Cura           *DataComponent `json:"cura"`
	Descartados    *DataComponent `json:"descartados"`
	Notificados    *DataComponent `json:"notificados"`
	Obitos         *DataComponent `json:"obitos"`
	Suspeitos      *DataComponent `json:"suspeitos"`
	LastUpdateDate time.Time      `json:"lastUpdateDate"`
}

type Case struct {
	DataNotificacao         string
	DataCadastro            string
	DataDiagnostico         string
	DataColeta_RT_PCR       string
	DataColetaTesteRapido   string
	DataColetaSorologia     string
	DataColetaSorologiaIGG  string
	DataEncerramento        string
	DataObito               string
	Classificacao           string
	Evolucao                string
	CriterioConfirmacao     string
	StatusNotificacao       string
	Municipio               string
	Bairro                  string
	FaixaEtaria             string
	IdadeNaDataNotificacao  string
	Sexo                    string
	RacaCor                 string
	Escolaridade            string
	Gestante                string
	Febre                   string
	DificuldadeRespiratoria string
	Tosse                   string
	Coriza                  string
	DorGarganta             string
	Diarreia                string
	Cefaleia                string
	ComorbidadePulmao       string
	ComorbidadeCardio       string
	ComorbidadeRenal        string
	ComorbidadeDiabetes     string
	ComorbidadeTabagismo    string
	ComorbidadeObesidade    string
	FicouInternado          string
	ViagemBrasil            string
	ViagemInternacional     string
	ProfissionalSaude       string
	PossuiDeficiencia       string
	MoradorDeRua            string
	ResultadoRT_PCR         string
	ResultadoTesteRapido    string
	ResultadoSorologia      string
	ResultadoSorologia_IGG  string
	TipoTesteRapido         string
}

func updateDataRoutine() {

	ticker := time.NewTicker(time.Minute * 30)

	for range ticker.C {
		go updateData()
	}
}

func isDataUpdated() bool {
	data, err := getData()
	if err != nil {
		log.Println("error reading data from database on isDataUpdated verification", err)
		return true
	}

	// 19:00 -03
	hourToUpdate := 22

	now := time.Now().UTC()
	updated := data.LastUpdateDate.UTC()

	//truncated to day
	truncatedNow := now.Truncate(time.Hour * 24)
	truncatedUpdate := updated.Truncate(time.Hour * 24)

	// at least is in the next day since the last update
	if truncatedNow.After(truncatedUpdate) {
		log.Println("at least one day since last update, should update data")
		return false
	}
	// same day than last update
	if truncatedNow.Equal(truncatedUpdate) {

		log.Println("same day than last update")

		// if has not been updated after hourToUpdate(19hrs) and now is after hourToUpdate, should update data
		if updated.Hour() < hourToUpdate && now.Hour() >= hourToUpdate {
			log.Println("data was not updated today, should update data")
			return false
		}

		log.Println("data was already updated today, should not update data")
	}

	log.Println("should not update data")
	return true
}

func getCaseDate(c Case) time.Time {

	d := ""

	if c.DataEncerramento != "" {
		d = c.DataEncerramento
	}
	if c.DataColetaTesteRapido != "" {
		d = c.DataColetaTesteRapido
	}
	if c.DataColeta_RT_PCR != "" {
		d = c.DataColeta_RT_PCR
	}
	if c.DataCadastro != "" {
		d = c.DataCadastro
	}
	if c.DataNotificacao != "" {
		d = c.DataNotificacao
	}
	if c.DataDiagnostico != "" {
		d = c.DataDiagnostico
	}
	parsed, err := time.Parse("2006-01-02", d)
	if err != nil {
		log.Fatal("error parsing date: ", err)
	}
	return parsed
}

type byDate []DataPoint

func (s byDate) Len() int {
	return len(s)
}

func (s byDate) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s byDate) Less(i, j int) bool {
	return s[i].X.Before(s[j].X)
}

func sortData(data *Data) {

	v := reflect.ValueOf(*data)
	for i := 0; i < v.NumField(); i++ {
		if v.Field(i).Type() == reflect.TypeOf(time.Time{}) {
			continue
		}
		value := v.Field(i).Interface()
		dataComponent := value.(*DataComponent)

		sort.Sort(byDate(dataComponent.DataPoints))

		newDataPoints := make([]DataPoint, 0)

		var lastDate time.Time
		count := 0

		for i, value := range dataComponent.DataPoints {

			date := value.X

			if i == 0 {
				count = value.Y
				lastDate = date
				continue
			}

			if !date.Equal(lastDate) {
				newDataPoints = append(newDataPoints, DataPoint{X: lastDate, Y: count})

				count += value.Y
				lastDate = date
			} else {
				count += value.Y
			}
		}

		dataComponent.DataPoints = newDataPoints
	}
}

func updateData() {

	var success bool

	if !updatingData && !downloadRetry {
		log.Println("Not in middle of any update or download retry")

		if _, err := os.Stat("./MICRODADOS.csv"); os.IsNotExist(err) {
			log.Println("Data file does not exists")
		} else {
			log.Println("Data file exists.")
			log.Println("Deleting data file to download updated one")

			err := os.Remove("./MICRODADOS.csv")
			if err != nil {
				log.Println("Error deleting existing data file: ", err)
				return
			}
			log.Println("Data file deleted")
		}
	}

	if updatingData && !downloadRetry {
		log.Println("data update already in progress")
		return
	}

	if updatingData && downloadRetry {
		log.Println("Data update already in progress")
		log.Println("Download failed on the last try")
		log.Println("Trying to resume download...")
		downloadRetry = false
	}

	if !updatingData && isDataUpdated() {
		log.Println("data already updated")
		return
	}

	log.Println("trying to update data")
	updatingData = true

	// create client
	grabClient := grab.NewClient()
	req, _ := grab.NewRequest(".", "https://bi.s3.es.gov.br/covid19/MICRODADOS.csv")

	// start download
	fmt.Printf("Downloading %v...\n", req.URL())
	resp := grabClient.Do(req)
	fmt.Printf("  %v\n", resp.HTTPResponse.Status)

	// start UI loop
	t := time.NewTicker(10 * time.Second)
	defer t.Stop()

Loop:
	for {
		select {
		case <-t.C:
			fmt.Printf("  transferred %v / %v bytes (%.2f%%)\n",
				resp.BytesComplete(),
				resp.Size,
				100*resp.Progress())

		case <-resp.Done:
			// download is complete
			break Loop
		}
	}

	// check for errors
	if err := resp.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Download failed: %v. Should retry\n", err)

		downloadRetry = true
		updateData()
	} else {
		success = true
	}

	// all calls to updateData that failed and would be returned later
	if !success {
		return
	}

	fmt.Printf("Download saved to ./%v \n", resp.Filename)

	updatingData = false
	downloadRetry = false

	f, err := os.Open("./MICRODADOS.csv")
	if err != nil {
		log.Println("Error opening data file: ", err)
		return
	}
	defer f.Close()

	gocsv.SetCSVReader(func(in io.Reader) gocsv.CSVReader {
		r := csv.NewReader(in)
		r.LazyQuotes = true
		r.Comma = ';'
		r.FieldsPerRecord = -1
		return r
	})

	log.Println("Reading data from data file")
	cases := []*Case{}
	err = gocsv.UnmarshalFile(f, &cases)
	if err != nil {
		log.Println("Error reading from data file: ", err)
		return
	}

	now := time.Now().UTC()
	data := &Data{
		Ativos:         &DataComponent{Count: 0, DataPoints: []DataPoint{}},
		Confirmados:    &DataComponent{Count: 0, DataPoints: []DataPoint{}},
		Cura:           &DataComponent{Count: 0, DataPoints: []DataPoint{}},
		Descartados:    &DataComponent{Count: 0, DataPoints: []DataPoint{}},
		Notificados:    &DataComponent{Count: 0, DataPoints: []DataPoint{}},
		Obitos:         &DataComponent{Count: 0, DataPoints: []DataPoint{}},
		Suspeitos:      &DataComponent{Count: 0, DataPoints: []DataPoint{}},
		LastUpdateDate: now,
	}

	for _, c := range cases {
		if c.Municipio == "ATILIO VIVACQUA" {
			switch c.Classificacao {
			case "Confirmados":
				data.Confirmados.Count++
				data.Confirmados.DataPoints = append(data.Confirmados.DataPoints, DataPoint{
					X: getCaseDate(*c),
					Y: 1,
				})

				if c.Evolucao == "Cura" {
					data.Cura.Count++
					data.Cura.DataPoints = append(data.Cura.DataPoints, DataPoint{
						X: getCaseDate(*c),
						Y: 1,
					})
				}
			case "Suspeito":
				data.Suspeitos.Count++
				data.Suspeitos.DataPoints = append(data.Suspeitos.DataPoints, DataPoint{
					X: getCaseDate(*c),
					Y: 1,
				})

			case "Descartados":
				data.Descartados.Count++
				data.Descartados.DataPoints = append(data.Descartados.DataPoints, DataPoint{
					X: getCaseDate(*c),
					Y: 1,
				})

			default:
				break
			}

			if c.DataNotificacao != "" {
				data.Notificados.Count++
				data.Notificados.DataPoints = append(data.Notificados.DataPoints, DataPoint{
					X: getCaseDate(*c),
					Y: 1,
				})
			}

			if c.StatusNotificacao == "Em Aberto" && c.Classificacao == "Confirmados" {
				data.Ativos.Count++
				data.Ativos.DataPoints = append(data.Ativos.DataPoints, DataPoint{
					X: getCaseDate(*c),
					Y: 1,
				})
			}

			obitoCovid := false

			splited := strings.Split(c.Evolucao, " ")
			if len(splited) == 3 {
				splited = splited[1:]
				evolucao := strings.Join(splited, " ")
				obitoCovid = evolucao == "pelo COVID-19"
			}

			if obitoCovid && c.StatusNotificacao == "Encerrado" && c.DataObito != "" {
				data.Obitos.Count++
				data.Obitos.DataPoints = append(data.Obitos.DataPoints, DataPoint{
					X: getCaseDate(*c),
					Y: 1,
				})
			}
		}
	}

	sortData(data)

	dataCollection := client.Database("covidAtilio").Collection("datas")

	log.Println("deleting existing data from database")
	_, err = dataCollection.DeleteMany(ctx, bson.M{})
	if err != nil {
		log.Println("error deleting existing data on update: ", err)
		return
	}

	log.Println("inserting new data to database")
	_, err = dataCollection.InsertOne(ctx, data)
	if err != nil {
		log.Println("error inserting new data on update: ", err)
		return
	}

	log.Println("data successfully updated")

}

func getData() (*Data, error) {

	log.Println("reading data from database")

	dataCollection := client.Database("covidAtilio").Collection("datas")

	cursor, err := dataCollection.Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("error reading from database: %s", err)
	}

	var datas []Data
	if err = cursor.All(ctx, &datas); err != nil {
		return nil, err
	}

	return &datas[0], nil
}

var (
	updatingData  bool
	downloadRetry bool
)

var client *mongo.Client
var ctx context.Context

func main() {

	var err error
	if os.Getenv("ENV") != "production" {
		err = godotenv.Load()
		if err != nil {
			log.Fatal("Error loading .env file")
		}
	}

	clientOptions := options.Client().ApplyURI(os.Getenv("MONGO_URI"))
	ctx = context.Background()
	client, err = mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	r := gin.Default()

	r.Use(static.Serve("/", static.LocalFile("./web", true)))

	// try to update data on server start
	go updateData()

	// routine to try to update data every 30 minutes
	go updateDataRoutine()

	// start a updateData try, but immediately returns data already stored in database
	r.GET("/data", func(c *gin.Context) {
		go updateData()

		data, err := getData()
		if err != nil {
			c.JSON(500, gin.H{"data": nil, "error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"data": data, "error": nil})
	})

	r.Run()
}
