## Setting up Dribbble

To get started go to <http://developer.dribbble.com/> and click on **Register a New Application**.

Enter **Name**, **Description**, **Website URL** and **Callback URL**. For the callback URL enter `http://localhost:3000/dribbble/auth`. Once you are done registering you will be given a **Client ID** and **Client Secret**.

Once you have your access token open the `server > .env` file and enter:

* **Client ID** string under `DRIBBBLE_CLIENT_ID`
* **Client Secret** string under `DRIBBBLE_CLIENT_SECRET`

Also make sure to set:

* `DRIBBBLE_INTEGRATION_DISABLED` to false
* `DRIBBBLE_OAUTH_ENABLED` to true
* `DRIBBBLE_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you post a shot to dribbble.

Next, restart the server and open the following url <http://localhost:3000/dribbble/auth>. you will be taken to Dribbble's website and will be asked to sign in and authorize your application. After you authorized you will be taken back to Syte2 and you will be given your **Access Token**. Open the `server > .env` file again and enter:

* **Access Token** under `DRIBBBLE_ACCESS_TOKEN`

Next, restart the server and open the following url <http://localhost:3000/dribbble/setup>. If everything is setup right, this will fetch some of your recent posts and save them to the database. If you have posted something recently, you should be able to go to <http://localhost:3000> and see that post in your stream and at this point your Dribbble page should be working.

---

Next: [Setting up Spotify & Last.fm](lastfm.md)
