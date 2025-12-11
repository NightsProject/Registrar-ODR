import os
import requests
from flask import request, jsonify
from . import whatsapp_bp 

GRAPH_API_TOKEN = os.getenv("GRAPH_API_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")

def send_whatsapp_message(recipient_number, template_name, components=None):
    if not GRAPH_API_TOKEN or not PHONE_NUMBER_ID:
        return {"error":"Whatsapp credentials are not loaded."}

    url=f"https://graph.facebook.com/v24.0/{PHONE_NUMBER_ID}/messages"

    headers={
        "Authorization": f"Bearer {GRAPH_API_TOKEN}",
        "Content-Type": "application/json"
    } 

    payload={
        "messaging_product": "whatsapp",
        "to": recipient_number,
        "type": "template",
        "template":{
            "name": template_name,
            "language":{
                "code": "en"
            },
            **({"components": components} if components is not None else {})
        }
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending the message: {e}")
        return {"error": str(e)}
    

@whatsapp_bp.route("/send_template", methods=["POST"])

def send_message_endpoint():

    data = request.json
    recipient = data.get("recipient")
    template_name = data.get("template_name")

    if not recipient:
        return jsonify({"error": "Missing recipient"}), 400
    
    result = send_whatsapp_message(recipient, template_name)

    if "error" in result:
        return jsonify({"status": "failed", "details": result["error"]}), 500
    
    return jsonify({"status": "success", "data": result}), 200
    


