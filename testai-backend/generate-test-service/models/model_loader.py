import gdown
import zipfile
import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import config

MODEL_ZIP = "Qwen2.5-1.5B-Instruct.zip"
ADAPTER_ZIP = "put_post_adapter.zip"
model = None
tokenizer = None

def download_model_and_adapter():
    # base model download
    if not os.path.exists(config.BASE_MODEL_PATH) or len(os.listdir(config.BASE_MODEL_PATH)) == 0:
        model_link = r'https://drive.google.com/file/d/1uOMm6NJb1O9CMIb0lytP9GgSbvLxH3kk/view?usp=drive_link'
        gdown.download(model_link, MODEL_ZIP, quiet=False, fuzzy=True)
        os.makedirs(config.BASE_MODEL_PATH, exist_ok=True)
        with zipfile.ZipFile(MODEL_ZIP, 'r') as zip_ref:
            zip_ref.extractall(config.BASE_MODEL_PATH)
    print("Base Model downloaded")

    # adapter download
    if not os.path.exists(config.ADAPTER_PATH) or len(os.listdir(config.ADAPTER_PATH)) == 0:
        adapter_link = r'https://drive.google.com/file/d/1OWTxNZyWcXElT-nmC_AZftCt6C2rscmU/view?usp=drive_link'
        gdown.download(adapter_link, ADAPTER_ZIP, quiet=False, fuzzy=True)
        os.makedirs(config.ADAPTER_PATH, exist_ok=True)
        with zipfile.ZipFile(ADAPTER_ZIP, 'r') as zip_ref:
            zip_ref.extractall(config.ADAPTER_PATH)
    print("Adapter downloaded")

    if os.path.exists(MODEL_ZIP):
        os.remove(MODEL_ZIP)
    if os.path.exists(ADAPTER_ZIP):
        os.remove(ADAPTER_ZIP)

def load_model():
    global model, tokenizer
    if model is not None:
        return model, tokenizer

    download_model_and_adapter()
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(config.ADAPTER_PATH, trust_remote_code=True)

    print("Loading base model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        config.BASE_MODEL_PATH,
        torch_dtype=torch.float16,
        device_map=None,
        local_files_only=True,
        trust_remote_code=True,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    base_model.to(device)
    
    print("Loading LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, config.ADAPTER_PATH)
    model.eval()

    return model, tokenizer