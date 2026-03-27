from pipeline.generation_pipeline import GenerationPipeline
from generators.base import BaseGenerator
import models.model_loader as model_loader
import config

class AIGenerator(BaseGenerator):
    def __init__(self):
        # The model and tokenizer are already loaded globally
        self.model = model_loader.model
        self.tokenizer = model_loader.tokenizer
        if self.model is None or self.tokenizer is None:
            raise RuntimeError(f'Model:{self.model is not None} and tokenizer:{self.tokenizer is not None}. Did you call load_model()?')
        self.max_seq_length = config.MAX_SEQ_LENGTH

    def generate(self, endpoint):
        # Use the GenerationPipeline from the notebook
        pipeline = GenerationPipeline(
            model=self.model,
            tokenizer=self.tokenizer,
            endpoint=endpoint,
            user_headers=config.DEFAULT_HEADERS
        )
        results = pipeline.run()   # returns list of processed results
        # Format results into the expected structure
        formatted = []
        for r in results:
            if r.get("_skipped"):
                continue
            formatted.append({
                "category": r["category"],
                "response": r["response"]
            })
        return formatted