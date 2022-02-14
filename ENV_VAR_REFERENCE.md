# Environment Variable Reference

| Variable          | Default | Description                                                                             |
| ----------------- | ------- | --------------------------------------------------------------------------------------- |
| MDS_UPLOAD_FOLDER |         | The location that files are persisted once uploaded.                                    |
| API_PORT          | 8888    | The port that the HTTP interface will listen upon for requests.                         |
| NODE_ENV          |         | If value is "test" then all logs are redirected to standard out.                        |
| MDS_LOG_URL       |         | The MDS Cloud logging endpoint that collects all logs for the ELK stack.                |
| ORID_PROVIDER_KEY |         | The provider element for all ORIDs created or consumed. Used in the validation process. |
| MDS_IDENTITY_URL  |         | The MDS Identity URL that is pre-configured in every container when it is built.        |