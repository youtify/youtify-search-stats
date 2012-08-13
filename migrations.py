import logging
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.api import urlfetch
from main import Entry
from string import Template
from django.utils import simplejson

TEMPLATE = """
<html>
<body>
</body>
Progress: $progress
<script type="text/javascript">
setTimeout(function() { location.href = '?page=$next'; }, 100);
</script>
</html>
"""

COMPLETE = """
<html>
<body>
<h1 style="color:green">DONE, $count deletions</h1>
</body>
</html>
"""

ref = None
n_deletions = 0

class MigrationStepHandler(webapp.RequestHandler):

    def get(self):
        global ref, n_deletions
        page = int(self.request.get('page', '0'))
        page_size = 60
        count = 0

        #### START MIGRATION CODE ####

        for m in Entry.all().fetch(page_size, page_size * page):
            count += 1
            if ref != None and m.latlon == ref.latlon and ref.q.startswith(m.q):
                #logging.info('deleting "%s" (ref = "%s")' % (m.q, ref.q))
                m.delete()
                n_deletions += 1
            else:
                ref = m

        #### END MIGRATION CODE ####

        self.response.headers['Content-Type'] = 'text/html'
        if (count < page_size):
            self.response.out.write(Template(COMPLETE).substitute({
                'count': n_deletions,
            }))
            n_deletions = 0
        else:
            self.response.out.write(Template(TEMPLATE).substitute({
                'progress': page_size * page,
                'next': page + 1,
            }))

def main():
    application = webapp.WSGIApplication([
        ('/migrate', MigrationStepHandler),
    ], debug=True)
    util.run_wsgi_app(application)

if __name__ == '__main__':
    main()
