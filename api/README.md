# logstation API

The logstation API provides access to restful actions for the logstation UI. All the logs go over the websocket, but certain things like the syntax colors are queried via REST, which this API provides. 

## Building
The REST API is codegen'd on the server and client side through [OpenAPITools/openapi-generator](https://github.com/OpenAPITools/openapi-generator). 

### Generate API Server
Install the openapi-generator and run the following in the `logstation` root folder:
```
java -jar .\openapi-generator-cli.jar generate -i .\api\logstation-rest-api.yaml -g go-echo-server -o api\server --additional-properties hideGenerationTimestamp=true
```  
This will create a `logstation/api/server` folder which gets imported into `main.go`.  
> Note: You may need to remove the `go.mod` after codegen so go doesn't treat `api/server` as it's own go module 