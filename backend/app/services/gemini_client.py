import json
import os
from typing import Dict, Any, Optional
from ..config import settings


class GeminiService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.model_name = settings.gemini_model or "gemini-2.5-flash"
        self.client = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                print(f"[Gemini] Initialized Google GenAI client with model: {self.model_name}")
            except Exception as e:
                print(f"[Gemini] Failed to initialize official GenAI client: {e}")
                self.client = None
        else:
            print("[Gemini] No GEMINI_API_KEY provided. Agent will utilize built-in heuristic reasoning fallback for zero-downtime offline demo.")

    def is_live(self) -> bool:
        return self.client is not None

    async def generate_structured_json(
        self,
        prompt: str,
        system_instruction: str,
        fallback_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Executes structured JSON generation using Gemini 2.5 Flash.
        Falls back gracefully to intelligent deterministic fallback if API is unconfigured.
        """
        if not self.client:
            return fallback_data

        try:
            from google.genai import types
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            if response and response.text:
                return json.loads(response.text)
        except Exception as e:
            print(f"[Gemini API Call Failed, using structured fallback] {e}")

        return fallback_data


gemini_service = GeminiService()
