
#########################
# Document Search
#########################
import os
import json
from fastapi import FastAPI
from openai import AzureOpenAI
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

# Load Environment Vars
load_dotenv()

class SearchDocuments():
    def __init__(self):
        self.admin_key = os.getenv('AZURE_ADMIN_KEY')
        self.endpoint = os.getenv('AZURESEARCH_ENDPOINT')
        openai_api_type = os.getenv('OPENAI_API_TYPE')
        openai_api_base = os.getenv('OPENAI_API_BASE')
        openai_api_version = os.getenv('OPENAI_API_VERSION')
        openai_api_key = os.getenv('OPENAI_API_KEY')
        self.openai_engine = os.getenv('OPENAI_ENGINE')
        self.openai_client = AzureOpenAI(
            api_key = openai_api_key,
            api_version=openai_api_version,
            azure_endpoint=openai_api_base,
        )
    def azure_search_query(self, query):
        search_client = SearchClient(endpoint=self.endpoint, index_name = 'manualsearch-index', credential=AzureKeyCredential(self.admin_key))
        result = [i for i in search_client.search(search_text=query)]
        text = ["Name: {}\nPage: {}\n".format(i['metadata_storage_name'].split('_')[0], int(i['metadata_storage_name'].split('_')[1].split('.pdf')[0])+1) + i['content'] for i in result]
        scores = [i['@search.score'] for i in result]
        return text, scores
    def query_openai_with_docs(self, query, documents):
        prompt_header = f"You must answer a question using information in the following documents. You must also reference the corresponding source document and page, as a source for where you got the documents. Each of the documents will be seperated using the characters ----, and each document will begin with its name and page, indicated by \'Name:\' and \'Page:\'. The question you must answer will be preceded by the term \'Question:\'. If you don't know the answer from the information in the provided documents, just say that you don't know, don't try to make up an answer.\n\nDocuments:\n"
        documents = '\n----'.join(documents)
        query = f"\nQuestion: {query}"
        gpt_query = prompt_header + documents + query
        chat_completion = self.openai_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": gpt_query,
                }
            ],
            model=self.openai_engine,
        )
        response = chat_completion.choices[0].message.content
        return response
    def query(self, query, search_docs, max_docs = 3):
        text, scores = self.azure_search_query(query)
        result = self.query_openai_with_docs(query, text[:max_docs])
        return result




# Define the app
app = FastAPI(
    title="MyApp",
    description="Hello API developer!",
    version="0.1.0"
)

#Define the APIs
@app.get("/")
async def main():
    return {"message": "This API only supports POST requests. Please use POST instead of GET."}

# Define a POST operation
@app.post("/submit")
async def submit(input):
    search_documents = SearchDocuments()
    query = "What do I do if detergent is left in the cups?"
    result = search_documents.query(query, search_documents)
    return {"message": f"{result}"}

########
# Use the Docs to set up Azure Search
# Once Set up, Input Azure Search Credentials in .env File
########


# search_documents = SearchDocuments()
# query = "What do I do if detergent is left in the cups?"
# result = search_documents.query(query, search_documents)
# print(result)
