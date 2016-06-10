###Setting up Tumblr

To get started go to <http://www.tumblr.com/oauth/register> to register your website. Fill in the information required, for default callback url just enter `http://localhost:3000`. Once you are done your website will be listed under <http://www.tumblr.com/oauth/apps> with a **OAuth Consumer Key** next to it.

Once you have your consumer key open the `server > .env` file and enter:

* **OAuth Consumer Key** string under `TUMBLR_API_KEY`

Also make sure to set:

* `TUMBLR_INTEGRATION_DISABLED` to false
* `TUMBLR_BLOG` to your tumblr url without the http (ex. ***rigoneri.tumblr.com***)
* `TUMBLR_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you post to Tumblr.

Next, restart the server and open the following url <http://localhost:3000/tumblr/setup>. If everything is setup right, this will fetch some of your recent posts and save them to the database. If you have posted to tumblr recently, you should be able to go to <http://localhost:3000> and see it in the stream and at this point your Tumblr page should also be working.

---

Next: [Heroku deployment instructions](heroku.md)
