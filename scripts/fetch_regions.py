import urllib.request
import json

url = 'https://raw.githubusercontent.com/vuski/admdongkor/master/ver20230701/HangJeongDong_ver20230701.geojson'

print('Downloading geojson...')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))

features = data.get('features', [])
regions = []

for f in features:
    props = f.get('properties', {})
    geom = f.get('geometry', {})
    if not props or not geom: continue
    
    adm_nm = props.get('adm_nm', '')
    if not adm_nm: continue

    coords = geom.get('coordinates', [])
    if not coords: continue

    try:
        if geom['type'] == 'MultiPolygon':
            lon, lat = coords[0][0][0]
        elif geom['type'] == 'Polygon':
            lon, lat = coords[0][0]
        else:
            continue
    except:
        continue
    
    _id = props.get('adm_cd', adm_nm.replace(' ', '-'))
    regions.append(f'  {{ id: "{_id}", name: "{adm_nm}", lat: {lat:.4f}, lon: {lon:.4f} }}')

out_path = 'c:/Users/user/xitora.cc/cafe-management/lib/regions.ts'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('export interface Region {\n  id: string;\n  name: string;\n  lat: number;\n  lon: number;\n}\n\n')
    f.write('export const KOREA_REGIONS: Region[] = [\n')
    f.write(',\n'.join(regions))
    f.write('\n];\n')

print(f'Successfully wrote {len(regions)} regions to {out_path}')
