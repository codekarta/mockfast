# mockfast

REST API Mocking Framework For Testing and Development

Mockfast is very small (a single class file) and lightweight application for building a mock server which, you just need
to download, update the rules and start using it.

### Rules (rules.json)

Rules files is a json array of rule where request/response rules can be defined.

Rules are matched based on `HTTP METHOD` and `URI PATH`, additionally request headers could be used for defining rules.

E.g: Add this simple rule in the rules.json file for an `HTTP GET METHOD` at `/` root

```json
[
  {
    "name": "simple get",
    "method": "GET",
    "path": "/",
    "responseBody": "welcome to mockfast"
  }
]
```

### Start the server:

Windows `run.bat` or `run.sh` on linux

Try this link : [http://localhost:7070](http://localhost:7070)

### Configuration

Command line arguments, look at run.bat file for example

| Argument | Description                | Default      |
|----------|----------------------------|--------------|
| `-p`     | Custom port number         | 7070         | 
| `-r`     | Custom rules file location | ./rules.json | 

### Response using json data file
If the rule gets matched it will look for response file at `"mocks/v1/"` location and respond back the data from this `users.json` file.
```json
[
  {
    "name": "response fom json file",
    "method": "GET",
    "path": "/v1/users",
    "responseFile": "mocks/v1/users.json"
  }
]
```

### Complex Rules Examples

Below rule will match the request using `HTTP METHOD` , `PATH` as well as `REQUEST HEADERS`
if headers are not present in the request or does not match the values, rule will not execute. if request is matched the
output will return plain text response with 2 headers added as `responseHeader` and `responseCode` would be `403` which is unauthorised.

```json
[
  {
    "name": "invalid login response",
    "method": "POST",
    "path": "/login",
    "responseBody": "Invalid user id or password",
    "requestHeader": {
      "user": "mockfast",
      "password": "invalid"
    },
    "responseHeader": {
      "header1": "this is header1",
      "header2": "this is header2"
    },
    "responseCode": 403
  }
]
```

For more examples please look at rules.json file.
