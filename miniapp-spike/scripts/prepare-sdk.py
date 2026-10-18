"""Copy the installed official miniapp SDK without installing or contacting a service."""
import json
import shutil
from pathlib import Path
root = Path(__file__).resolve().parents[1]
source = root.parent / 'prototype/node_modules/@cloudbase/js-sdk'
version = json.loads((source / 'package.json').read_text())['version']
if version != '3.10.2':
    raise SystemExit('Expected SDK 3.10.2, found ' + version)
target = root / 'miniprogram/vendor/cloudbase'
shutil.copytree(source / 'miniprogram_dist', target, dirs_exist_ok=True)
for filename in ('LICENSE', 'LICENSE.txt', 'LICENSE.md'):
    if (source / filename).exists():
        shutil.copy2(source / filename, target / filename)
print('Prepared official CloudBase miniapp distribution ' + version)
