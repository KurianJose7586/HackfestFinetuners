from fastapi import APIRouter, Request, HTTPException, Response
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import gmail
import pdf
from state import user_credentials
from models import SelectedItemsRequest

# Load environment variables - ensure we look in the parent directory for .env
load_dotenv(Path(__file__).parent.parent / ".env")

# Add 'Noise filter module' directory to sys.path
sys.path.append(str(Path(__file__).parent.parent.parent / "Noise filter module"))
from integration_pipeline import process_external_content

router = APIRouter(prefix="/gmail", tags=["Gmail"])

# Configuration - use getenv directly here to avoid stale values if module is imported early
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = "http://localhost:8000/gmail/oauth_redirect"

@router.get("/login")
def gmail_login():
    if not CLIENT_ID or not CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google credentials not configured in .env")
    
    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "project_id": "brd-generator", 
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
    
    return RedirectResponse(authorization_url)

@router.get("/oauth_redirect")
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

@router.get("/check")
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

@router.get("/search")
def search_gmail(senders: str = ""):
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

@router.get("/download/{message_id}/{attachment_id}")
def download_gmail_attachment(message_id: str, attachment_id: str, filename: str = "attachment.pdf"):
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
            
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/extract_batch")
def gmail_extract_batch(count: int = 5):
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

@router.post("/process_selected")
def gmail_process_selected(request: SelectedItemsRequest):
    creds_data = user_credentials.get("main_user")
    if not creds_data:
        raise HTTPException(status_code=401, detail="User not authenticated. Go to /gmail/login")
    
    credentials = Credentials(**creds_data)
    try:
        service = gmail.get_gmail_service(credentials)
        processed_count = 0
        for msg_id in request.message_ids:
            email_data = gmail.get_email_details(service, msg_id)
            
            # Process main email body
            try:
                process_external_content(
                    text=email_data["body"],
                    speaker=email_data["from"],
                    source_ref=msg_id,
                    subject=email_data["subject"],
                    source_type="email",
                    session_id=request.session_id
                )
                processed_count += 1
            except Exception as e:
                print(f"Error processing email {msg_id}: {e}")
            
            # Process PDF attachments
            for att in email_data["attachments"]:
                if att["filename"].lower().endswith(".pdf"):
                    try:
                        pdf_data = gmail.download_attachment(service, msg_id, att["attachment_id"])
                        extracted_text = pdf.extract_text_from_pdf_bytes(pdf_data)
                        if extracted_text:
                            process_external_content(
                                text=extracted_text,
                                speaker=email_data["from"],
                                source_ref=f"{msg_id}_{att['filename']}",
                                subject=email_data["subject"],
                                source_type="document",
                                session_id=request.session_id
                            )
                            processed_count += 1
                    except Exception as e:
                        print(f"Error processing attachment {att['filename']} in email {msg_id}: {e}")
                        
        return {
            "status": "success",
            "processed_items_count": processed_count,
            "session_id": request.session_id or "new_session_created"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
