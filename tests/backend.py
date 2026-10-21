import importlib.util, json, pathlib, secrets, threading, unittest, urllib.request, urllib.error
ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('backend',ROOT/'server/app.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Backend(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  m.TOKEN=secrets.token_urlsafe(24);m.KEY='';cls.http=m.ThreadingHTTPServer(('127.0.0.1',0),m.Handler);cls.url='http://127.0.0.1:'+str(cls.http.server_port);threading.Thread(target=cls.http.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.http.shutdown();cls.http.server_close()
 def call(self,path,token=True,origin=m.ALLOWED,body=None):
  headers={'Origin':origin,'Content-Type':'application/json'}
  if token:headers['Authorization']='Bearer '+m.TOKEN
  req=urllib.request.Request(self.url+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
  try:
   with urllib.request.urlopen(req) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_auth(self):self.assertEqual(self.call('/api/health',False)[0],401)
 def test_origin(self):self.assertEqual(self.call('/api/health',True,'https://example.org')[0],401)
 def test_health(self):
  code,body=self.call('/api/health');self.assertEqual(code,200);self.assertFalse(body['deepseek'])
 def test_missing_key(self):
  code,body=self.call('/api/chat',body={'text':'你好'});self.assertEqual(code,400);self.assertIn('密钥',body['error'])
 def test_paired_bearer_without_cookie(self):
  req=urllib.request.Request(self.url+'/api/health',headers={'Origin':'null','Authorization':'Bearer '+m.browser_token()})
  with urllib.request.urlopen(req) as r:
   self.assertEqual(r.status,200);self.assertEqual(r.headers['Access-Control-Allow-Origin'],'null')
 def test_opaque_cookie_without_bearer_rejected(self):
  req=urllib.request.Request(self.url+'/api/health',headers={'Origin':'null','Cookie':'companion_session='+m.TOKEN})
  with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(req)
  self.assertEqual(error.exception.code,401)
 def test_no_files(self):self.assertEqual(self.call('/.env.local')[0],404)
if __name__=='__main__':unittest.main()
