##Setting up Dribbble

To get started go to <http://developer.dribbble.com/> and click on **Register a New Application**.

Enter **Name**, **Description**, **Website URL** and **Callback URL**. After that is done, at the bottom of the page Dribbble will give you a **Client Access Token**.

Once you have your access token open the `server > .env` file and enter:

* **Client Access Token** string under `DRIBBBLE_ACCESS_TOKEN`

Also make sure to set:

* `DRIBBBLE_INTEGRATION_DISABLED` to false
* `DRIBBBLE_USERNAME` to your dribbble username, without the *@*
* `DRIBBBLE_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you post a shot to dribbble.

Next, restart the server and open the following url <http://localhost:3000/dribbble/setup>. If everything is setup right, this will fetch some of your recent shots and save them to the database. If you have posted shot recently, you should be able to go to <http://localhost:3000> and see it in the stream and at this point your Dribbble page should also be working.

---

Next: [Setting up Spotify & Last.fm](lastfm.md)
