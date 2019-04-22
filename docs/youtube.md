### Setting up YouTube

To get started, login to the Google Developers Console by going to <https://console.developers.google.com>. Navigate to `API Manager > Credentials` and create a new project, after that's done go to the [OAuth consent screen](https://console.developers.google.com/apis/credentials/consent) and enter a **Product name** (all other fields are optional).

Next click on `Create credentials > OAuth client ID` and enter the following:

* **Application type:** Web Application
* **Name:** Syte
* **Authorized JavaScript origins:** Enter ***http://localhost:3000*** and your webstie url (ex. ***http://rigoneri.com***)
* **Authorized redirect URIs:** ***http://localhost:3000/youtube/auth***

Once you are done you will be given a **Client ID** and **Client Secret**.

Next navigate to `API Manager > Overview` and in the search for **YouTube Data API** and enable the service, then open the `server > .env` file and enter:

* **Client ID** string under `YOUTUBE_CLIENT_ID`
* **Client Secret** string under `YOUTUBE_CLIENT_SECRET`

Also make sure to set:

* `YOUTUBE_INTEGRATION_DISABLED` to false
* `YOUTUBE_OAUTH_ENABLED` to true
* `YOUTUBE_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you post a video to YouTube.

Next, restart the server and open the following url <http://localhost:3000/youtube/auth>, you will be taken to Google's website and will be asked to sign in and authorize your application. After you authorized you will be taken back to Syte2 and you will be given an **Access Token**, a **Refresh Token** and your **Playlist ID**. Open the `server > .env` file again and enter:

* **Access Token** under `YOUTUBE_ACCESS_TOKEN`
* **Refresh Token** under `YOUTUBE_REFRESH_TOKEN`
* **Playlist ID** under `YOUTUBE_PLAYLIST_ID`

Next, restart the server and open the following url <http://localhost:3000/youtube/setup>. If everything is setup right, this will fetch some of your recent videos and save them to the database. If you have posted a video recently, you should be able to go to <http://localhost:3000> and see that video in your stream and at this point your YouTube page should be working.

---

Next: [Setting up Foursquare](foursquare.md)
