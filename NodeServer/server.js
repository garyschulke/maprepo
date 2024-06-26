import express from 'express';
import Breeze from 'breeze-chms';

const app = new express();
app.listen(5500, '0.0.0.0',() => console.log('listening at 5500'));
app.use(express.static('.'));
app.use(express.json({ limit: '10mb' }));

const BRZ_KEY = '176199653882149d82bdab0d8ece06a8';
const SUBDOMAIN = 'covhsv';
const breeze = new Breeze(SUBDOMAIN, BRZ_KEY);

app.get('/api', (request, response) => {
  let members;
  (async () => {
    try {
      members = await breeze.people.api.list({ details: 1 });
      response.status(200);
      response.setHeader('Content-type','application/json');
      response.setHeader('Access-Control-Allow-Origin', '*'); 
      await response.json(members);
      response.end();
    }
    catch (error) {
      // Handle the error here
      console.error('An error occurred:', error.message);
    }
  })();

});

