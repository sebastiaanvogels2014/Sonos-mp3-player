import sys, json, socket, urllib.request, urllib.parse

TIMEOUT = 1.0

def discover():
    msg = 'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: urn:schemas-upnp-org:device:ZonePlayer:1\r\n\r\n'.encode()
    s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM,socket.IPPROTO_UDP); s.settimeout(TIMEOUT)
    s.sendto(msg,('239.255.255.250',1900)); found={}
    try:
        while True:
            data,addr=s.recvfrom(8192); text=data.decode('utf-8','ignore'); headers={}
            for line in text.split('\r\n')[1:]:
                if ':' in line:
                    k,v=line.split(':',1); headers[k.lower()]=v.strip()
            if 'location' in headers: found[addr[0]]=headers['location']
    except socket.timeout: pass
    finally: s.close()
    players=[]
    for ip,loc in found.items():
        try:
            xml=urllib.request.urlopen(loc,timeout=2).read().decode('utf-8','ignore')
            import re
            name=re.search(r'<friendlyName>(.*?)</friendlyName>',xml,re.I)
            players.append({'ip':ip,'name':name.group(1) if name else ip})
        except: players.append({'ip':ip,'name':ip})
    return {'players':players}

def control(ip, action, url=None):
    base=f'http://{ip}:1400'
    service=base+'/MediaRenderer/AVTransport/Control'
    if action=='play':
        body=f'''<u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><CurrentURI>{urllib.parse.quote(url,safe=':/?=&%')}</CurrentURI><CurrentURIMetaData></CurrentURIMetaData></u:SetAVTransportURI>'''
        soap(service, 'SetAVTransportURI', body)
        soap(service, 'Play', '<u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Speed>1</Speed></u:Play>')
    else:
        act='Pause' if action=='pause' else 'Stop'
        soap(service,act,f'<u:{act} xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:{act}>')
    return {'ok':True}

def soap(url, action, inner):
    envelope=f'<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>{inner}</s:Body></s:Envelope>'
    req=urllib.request.Request(url,data=envelope.encode(),headers={'Content-Type':'text/xml; charset="utf-8"','SOAPACTION':f'"urn:schemas-upnp-org:service:AVTransport:1#{action}"'})
    urllib.request.urlopen(req,timeout=5).read()

args=sys.argv[1:]
try:
    if args[0]=='discover': print(json.dumps(discover()))
    elif args[0] in ('play','pause','stop'): print(json.dumps(control(args[1],args[0],args[2] if len(args)>2 else None)))
except Exception as e: print(json.dumps({'error':str(e)})); sys.exit(1)
