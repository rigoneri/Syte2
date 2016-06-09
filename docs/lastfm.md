##Setting up Spotify with Last.fm

The Spotify integration is done via Last.fm since Spotify doesn't have the API we need. So before we can setup the integration you first need a to [Sign up to Last.fm](http://www.last.fm/) then on Spotify go to **Preferences** and under *Social* connect with Last.fm. After that's done every time a song is played Spotify will send that track information to Last.fm. So now, start playing a few songs and after a little while check if those songs are appearing in your Last.fm profile.

Now that you have some data on Last.fm we need to get an **API_KEY**. Follow the [Getting started](http://www.last.fm/api) instructions and once you are done you should be able to get an **API Key** from [your api account page](http://www.last.fm/api/account).

Once you have your API Key from Last.fm open the `server > .env` file and enter:

* **API_KEY** under `LASTFM_API_KEY`

Also make sure to set:

* `LASTFM_INTEGRATION_DISABLED` to false
* `LASFM_USERNAME` to your Last.fm username
* `LASTFM_UPDATE_STREAM_FREQ_MINUTES` to the number of minutes you want to wait before updating the data in your stream.
* `LASTFM_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data in the Spotify page

`Note` A small number is not always the best and it might make Syte2 slow. If you are unsure just keep the default values.

Next, restart the server and open the following url <http://localhost:3000/lastfm/setup>. If everything is setup right, this will fetch about 3000 of your recent played tracks, group them by day and save them to the database. If you have listened to music recently, you should be able to go to <http://localhost:3000> and see it in your stream and at this point your Spotify page should also be working.

---

Next: [Setting up Instagram](instagram.md)
