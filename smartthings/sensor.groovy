definition(
    name: "Sensor Reporter",
    namespace: "demo.sensor",
    author: "Demo",
    description: "Send sensor readings some place",
    category: "SmartThings Labs",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png",
    iconX3Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")


preferences {
    section("Select sensor"){
		input "sensor", "capability.temperatureMeasurement", title: "Sensor"
    }
    section("Set reporting URL"){
		input "reportURL", "string", title: "Report URL"
	}
    section("Set reporting passcode"){
		input "reportPasscode", "string", title: "Report Passcode"
	}
}

def installed() {
	log.debug "Installed with settings: ${settings}"

	initialize()
}

def updated() {
	log.debug "Updated with settings: ${settings}"

	unsubscribe()
	initialize()
}

def initialize() {
	subscribe(sensor, "humidity", humidityHandler)
    subscribe(sensor, "motion.active", motionActiveHandler)
    subscribe(sensor, "motion.inactive", motionInactiveHandler)
    subscribe(sensor, "temperature", temperatureHandler)
}

def humidityHandler(evt)
{
  reportHumidity(evt.doubleValue)
}

def motionActiveHandler(evt)
{
  log.debug evt.value
  reportActiveMotion()
}

def motionInactiveHandler(evt)
{
  log.debug evt.value
  reportInactiveMotion()
}

def temperatureHandler(evt)
{
  reportTemperature(evt.doubleValue)
}

def reportHumidity(humidity)
{
	def params = [
          role: "smartthings",
          cmd: "write",
          type: "humidity",
    	    value: humidity,
          passcode: reportPasscode
        ]

	try {
        httpPostJson(reportURL, params) { resp ->
            resp.headers.each {
               log.debug "${it.name} : ${it.value}"
            }
            log.debug "response contentType: ${resp.contentType}"
            log.debug "response data: ${resp.data}"
        }
    } catch (e) {
        log.error "something went wrong sending report: $e"
    }
}

def reportActiveMotion()
{
	def params = [
          role: "smartthings",
          cmd: "write",
          type: "motion",
    	    value: 1,
          passcode: reportPasscode
        ]

	try {
        httpPostJson(reportURL, params) { resp ->
            resp.headers.each {
               log.debug "${it.name} : ${it.value}"
            }
            log.debug "response contentType: ${resp.contentType}"
            log.debug "response data: ${resp.data}"
        }
    } catch (e) {
        log.error "something went wrong sending report: $e"
    }
}

def reportInactiveMotion()
{
	def params = [
          role: "smartthings",
          cmd: "write",
          type: "motion",
    	    value: 0,
          passcode: reportPasscode
        ]

	try {
        httpPostJson(reportURL, params) { resp ->
            resp.headers.each {
               log.debug "${it.name} : ${it.value}"
            }
            log.debug "response contentType: ${resp.contentType}"
            log.debug "response data: ${resp.data}"
        }
    } catch (e) {
        log.error "something went wrong sending report: $e"
    }
}

def reportTemperature(temperature)
{
	def params = [
          role: "smartthings",
          cmd: "write",
          type: "temperature",
    	    value: temperature,
          passcode: reportPasscode
        ]

	try {
        httpPostJson(reportURL, params) { resp ->
            resp.headers.each {
               log.debug "${it.name} : ${it.value}"
            }
            log.debug "response contentType: ${resp.contentType}"
            log.debug "response data: ${resp.data}"
        }
    } catch (e) {
        log.error "something went wrong sending report: $e"
    }
}
