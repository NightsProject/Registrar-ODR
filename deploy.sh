#run tailscale funnel
tailscale funnel 8000

#initialize the project
python3 -m venv odr
source odr/bin/activate && pip install --upgrade pip
source odr/bin/activate && pip install -r requirements.txt
cd frontend && npm install && npm run build

flask run



#Dependencies
tailscale

should be registered in oath for admin login
