import os
import random
from google.appengine.api import urlfetch
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util
from django.utils import simplejson

ON_PRODUCTION = os.environ['SERVER_SOFTWARE'].startswith('Google App Engine') # http://stackoverflow.com/questions/1916579/in-python-how-can-i-test-if-im-in-google-app-engine-sdk

class Entry(db.Model):
    timestamp = db.DateTimeProperty(auto_now_add=True)
    q = db.StringProperty()
    country = db.StringProperty()
    region = db.StringProperty()
    city = db.StringProperty()
    latlon = db.StringProperty()

class ImportFromProductionHandler(webapp.RequestHandler):

    def get(self):
        if ON_PRODUCTION:
            return

        url = 'http://youtify-search-stats.appspot.com/entries'
        response = urlfetch.fetch(url, deadline=60)
        json = simplejson.loads(response.content)

        for entry in json:
            q = entry['q']
            country = entry['country']
            region = entry['region']
            city = entry['city']
            latlon = entry['latlon']
            m = Entry(q=q, country=country, region=region, city=city, latlon=latlon)
            m.put()

        self.redirect('/entries')

class FakeSetupHandler(webapp.RequestHandler):

    def get(self):
        if ON_PRODUCTION:
            return

        artists = (
            'Robyn',
            'rymdlego',
            'melodysheep',
            'Symphony of Science',
            'Timbuktu',
            'Infected Mushroom',
            'Laleh',
        )

        for i in range(0,100):
            q = random.choice(artists)
            country = 'SE'
            region = None
            city = 'malmo'
            latlon = '51.603330,17.001302'
            m = Entry(q=q, country=country, region=region, city=city, latlon=latlon)
            m.save()

        self.redirect('/entries')

class EntriesHandler(webapp.RequestHandler):

    def get(self):
        json = []

        for m in Entry.all().order('-timestamp'):
            json.append({
                'q': m.q,
                'country': m.country,
                'region': m.region,
                'city': m.city,
                'latlon': m.latlon,
            })

        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(simplejson.dumps(json))

    def post(self):
        q = self.request.get('q')
        country = self.request.headers.get('X-AppEngine-Country', None)
        region = self.request.headers.get('X-AppEngine-Region', None)
        city = self.request.headers.get('X-AppEngine-City', None)
        latlon = self.request.headers.get('X-AppEngine-CityLatLong', None)

        m = Entry(q=q, country=country, region=region, city=city, latlon=latlon)
        m.save()

        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(simplejson.dumps({'message': 'ok'}))

class MainHandler(webapp.RequestHandler):

    def get(self):
        path = os.path.join(os.path.dirname(__file__), 'html', 'index.html')
        self.response.headers['Content-Type'] = 'text/html; charset=utf-8';
        self.response.out.write(template.render(path, {}))

def main():
    application = webapp.WSGIApplication([
        ('/import', ImportFromProductionHandler),
        ('/fakesetup', FakeSetupHandler),
        ('/entries', EntriesHandler),
        ('/', MainHandler),
    ], debug=True)
    util.run_wsgi_app(application)

if __name__ == '__main__':
    main()
