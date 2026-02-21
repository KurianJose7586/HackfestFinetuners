import os
import json
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv
import slack_auth

# Load environment variables
load_dotenv()

app = FastAPI(title="Gmail OAuth Integration")

# Configuration
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = "http://localhost:8000/gmail/oauth_redirect"

# In-memory storage for credentials (for demo purposes)
user_credentials = {}

@app.get("/")
def read_root():
    return {"message": "Welcome to Gmail OAuth Integration. Go to /gmail/login to start."}

@app.get("/gmail/login")
def gmail_login():
    if not CLIENT_ID or not CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google credentials not configured in .env")
    
    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "project_id": "brd-generator", # Placeholder if unknown
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": CLIENT_SECRET,
            "redirect_uris": [REDIRECT_URI]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    
    # Store state in a real app (session). Here we skip strict state verification for simplicity.
    return RedirectResponse(authorization_url)

@app.get("/gmail/oauth_redirect")
def gmail_oauth_redirect(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    
    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "project_id": "hackfest2.0",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": CLIENT_SECRET,
            "redirect_uris": [REDIRECT_URI]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    flow.fetch_token(code=code)
    
    credentials = flow.credentials
    user_credentials["main_user"] = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes
    }
    
    return {"message": "Authentication successful! You can now visit /gmail/check"}

# --- Slack OAuth Routes ---

@app.get("/slack/login")
def slack_login():
    if not os.getenv("SLACK_CLIENT_ID") or not os.getenv("SLACK_CLIENT_SECRET"):
        raise HTTPException(status_code=500, detail="Slack credentials not configured in .env")
    
    auth_url = slack_auth.get_slack_auth_url()
    return RedirectResponse(auth_url)

@app.get("/slack/oauth_redirect")
def slack_oauth_redirect(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    
    try:
        auth_response = slack_auth.exchange_code_for_token(code)
        
        # Store Slack credentials
        user_credentials["slack_user"] = {
            "access_token": auth_response.get("access_token"),
            "team_id": auth_response.get("team", {}).get("id"),
            "bot_user_id": auth_response.get("bot_user_id"),
            "scopes": auth_response.get("scope")
        }
        
        return {
            "message": "Slack authentication successful!",
            "team_name": auth_response.get("team", {}).get("name"),
            "access_granted": auth_response.get("scope")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slack authentication failed: {str(e)}")

@app.get("/slack/messages")
def slack_messages(channel_id: str):
    """
    Get all messages from a Slack channel.
    Query param format: ?channel_id=C12345
    """
    creds_data = user_credentials.get("slack_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="Slack user not authenticated. Go to /slack/login")
    
    token = creds_data.get("access_token")
    try:
        messages = slack_auth.get_channel_messages(token, channel_id)
        
        # Resolve user IDs to names (with simple in-memory caching for the request)
        user_cache = {}
        processed_messages = []
        
        for msg in messages:
            user_id = msg.get("user")
            if user_id:
                if user_id not in user_cache:
                    user_info = slack_auth.get_user_info(token, user_id)
                    user_cache[user_id] = user_info.get("real_name", user_id) if user_info else user_id
                msg["user_name"] = user_cache[user_id]
            
            # Apply regex cleaning to Slack message text
            msg["text"] = slack_auth.strip_slack_formatting(msg.get("text", ""))
            
            # Process files to find PDFs
            msg["parsed_pdfs"] = []
            if "files" in msg:
                for f in msg["files"]:
                    if f.get("filetype") == "pdf" or f.get("name", "").lower().endswith(".pdf"):
                        try:
                            # Download PDF content
                            pdf_url = f.get("url_private_download")
                            if pdf_url:
                                pdf_data = slack_auth.download_slack_file(token, pdf_url)
                                # Extract text
                                extracted_text = pdf.extract_text_from_pdf_bytes(pdf_data)
                                msg["parsed_pdfs"].append({
                                    "name": f.get("name"),
                                    "extracted_text": extracted_text
                                })
                        except Exception as e:
                            print(f"Error parsing Slack PDF {f.get('name')}: {e}")
            
            processed_messages.append(msg)
            
        return {
            "channel_id": channel_id,
            "count": len(processed_messages),
            "messages": processed_messages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Slack messages: {str(e)}")

@app.get("/slack/channels")
def slack_channels():
    """
    List all Slack channels the bot is in.
    """
    creds_data = user_credentials.get("slack_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="Slack user not authenticated. Go to /slack/login")
    
    token = creds_data.get("access_token")
    try:
        channels = slack_auth.list_channels(token)
        return {
            "count": len(channels),
            "channels": [
                {"id": c["id"], "name": c["name"], "is_member": c.get("is_member")}
                for c in channels
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Slack channels: {str(e)}")

@app.get("/slack/post")
def slack_post(channel_id: str, text: str):
    """
    Post a message to a Slack channel.
    Query param format: ?channel_id=C12345&text=Hello%20World
    """
    creds_data = user_credentials.get("slack_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="Slack user not authenticated. Go to /slack/login")
    
    token = creds_data.get("access_token")
    try:
        result = slack_auth.post_message(token, channel_id, text)
        return {
            "message": "Message posted successfully!",
            "ts": result.get("ts"),
            "channel": result.get("channel")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to post Slack message: {str(e)}")

import gmail
import pdf

@app.get("/gmail/check")
def gmail_check(count: int = 1):
    creds_data = user_credentials.get("main_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="User not authenticated. Go to /gmail/login")
    
    credentials = Credentials(**creds_data)
    
    try:
        service = gmail.get_gmail_service(credentials)
        results = service.users().messages().list(userId="me", maxResults=count).execute()
        messages = results.get("messages", [])
        
        if not messages:
            return {"message": "No messages found."}
        
        emails = []
        for msg in messages:
            email_data = gmail.get_email_details(service, msg["id"])
            
            # Process attachments to find PDFs
            processed_attachments = []
            for att in email_data["attachments"]:
                att_info = att.copy()
                if att["filename"].lower().endswith(".pdf"):
                    try:
                        # Fetch the attachment content
                        pdf_data = gmail.download_attachment(service, msg["id"], att["attachment_id"])
                        # Extract text
                        extracted_text = pdf.extract_text_from_pdf_bytes(pdf_data)
                        att_info["extracted_text"] = extracted_text
                    except Exception as e:
                        att_info["extraction_error"] = str(e)
                processed_attachments.append(att_info)

            emails.append({
                "subject": email_data["subject"],
                "from": email_data["from"],
                "body": email_data["body"],
                "message_id": email_data["message_id"],
                "attachments": processed_attachments
            })
            
        return {
            "count": len(emails),
            "emails": emails
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gmail/search")
def search_gmail(senders: str = ""):
    """
    Search for emails from specific senders.
    Query param format: ?senders=email1@gmail.com,email2@gmail.com
    """
    creds_data = user_credentials.get("main_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="User not authenticated. Go to /gmail/login")
    
    credentials = Credentials(**creds_data)
    
    try:
        service = gmail.get_gmail_service(credentials)
        
        query = ""
        if senders:
            sender_list = [s.strip() for s in senders.split(",") if s.strip()]
            if sender_list:
                query = "from:(" + " OR ".join(sender_list) + ")"
        
        results = service.users().messages().list(userId="me", q=query, maxResults=10).execute()
        messages = results.get("messages", [])
        
        if not messages:
            return {"message": "No messages found.", "query": query}
        
        found_emails = []
        for m in messages:
            found_emails.append(gmail.get_email_details(service, m["id"]))
            
        return {
            "query": query,
            "count": len(found_emails),
            "emails": found_emails
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gmail/download/{message_id}/{attachment_id}")
def download_gmail_attachment(message_id: str, attachment_id: str, filename: str = "attachment.pdf"):
    """
    Download an attachment from a Gmail message.
    """
    creds_data = user_credentials.get("main_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="User not authenticated. Go to /gmail/login")
    
    credentials = Credentials(**creds_data)
    
    try:
        service = gmail.get_gmail_service(credentials)
        data = gmail.download_attachment(service, message_id, attachment_id)
        
        # Save locally for verification
        os.makedirs("attachments", exist_ok=True)
        file_path = os.path.join("attachments", filename)
        with open(file_path, "wb") as f:
            f.write(data)
            
        from fastapi.responses import Response
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gmail/extract_batch")
def gmail_extract_batch(count: int = 5):
    """
    Download all attachments from the last N emails.
    """
    creds_data = user_credentials.get("main_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="User not authenticated. Go to /gmail/login")
    
    credentials = Credentials(**creds_data)
    
    try:
        service = gmail.get_gmail_service(credentials)
        results = service.users().messages().list(userId="me", maxResults=count).execute()
        messages = results.get("messages", [])
        
        if not messages:
            return {"message": "No messages found."}
        
        os.makedirs("attachments", exist_ok=True)
        downloaded = []
        
        for msg in messages:
            email_data = gmail.get_email_details(service, msg["id"])
            for att in email_data["attachments"]:
                filename = att["filename"]
                # Avoid overwriting with same name by prefixing message_id
                safe_filename = f"{msg['id']}_{filename}"
                data = gmail.download_attachment(service, msg["id"], att["attachment_id"])
                
                file_path = os.path.join("attachments", safe_filename)
                with open(file_path, "wb") as f:
                    f.write(data)
                
                downloaded.append({
                    "message_id": msg["id"],
                    "filename": filename,
                    "saved_as": safe_filename
                })
        
        return {
            "status": "success",
            "emails_checked": len(messages),
            "files_downloaded_count": len(downloaded),
            "files": downloaded
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
