import os
import shutil
import tempfile
import subprocess
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="pptx2md API Pipeline")

# CRITICAL: Allow origins ["*"] for development.
# Update this to the exact Netlify production URL later (e.g., ["https://your-app.netlify.app"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/convert")
async def convert_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pptx"):
        raise HTTPException(status_code=400, detail="Invalid file format. Only PPTX is supported.")

    with tempfile.TemporaryDirectory() as temp_dir:
        input_path = os.path.join(temp_dir, file.filename)
        output_path = os.path.join(temp_dir, "output.md")
        
        # Save uploaded file to temp directory
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            # Wrap pptx2md core logic using subprocess since pptx2md is essentially a CLI tool,
            # or you can import from pptx2md.parser and pptx2md.outputter if you prefer.
            subprocess.run(
                ["pptx2md", input_path, "-o", output_path],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Read back generated markdown
            markdown_content = ""
            if os.path.exists(output_path):
                with open(output_path, "r", encoding="utf-8") as md_file:
                    markdown_content = md_file.read()
            else:
                raise HTTPException(status_code=500, detail="Markdown file was not generated.")
            
            return {
                "markdown": markdown_content,
                "metadata": {
                    "filename": file.filename,
                    "content_length": len(markdown_content)
                }
            }
                
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Failed to process PPTX: {e.stderr or e.stdout}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
