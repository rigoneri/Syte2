##Setting up Twitter

To get started, create a new application on Twitter for your website by going to <https://dev.twitter.com/apps/new>. Once you are done creating your application you will be taken to the application page, from there navigate to the *Keys and Access Tokens* page.

At the top of the page it will give you a **Consumer Key** and a **Consumer Secret** that you will need. At the bottom of the page there is a link called **Create my access token** click on that link. It will auto-generate your **Access Token** and **Access Token Secret** that you will also need.

Once you have those four items open the `server > .env` file and enter:

* **Consumer key** string under `TWITTER_CONSUMER_KEY`
* **Consumer secret** string under  `TWITTER_CONSUMER_SECRET`
* **Access token** string under `TWITTER_ACCESS_TOKEN_KEY`
* **Access token secret** string under `TWITTER_ACCESS_TOKEN_SECRET`

Also make sure to set:

* `TWITTER_INTEGRATION_DISABLED` to false
* `TWITTER_USERNAME` to your twitter username, without the *@*
* `TWITTER_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you tweet.

Next, restart the server and open the following url <http://localhost:3000/twitter/setup>. If everything is setup right, this will fetch about 300 of your recent tweets and save them to the database. If you have tweeted recently, you should be able to go to <http://localhost:3000> and see in your stream and at this point your Twitter page should also be working.

---

Next: [Setting up Github](github.md)
