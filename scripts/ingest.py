from langchain_community.document_loaders import TextLoader, PyPDFLoader, CSVLoader, UnstructuredWordDocumentLoader, UnstructuredMarkdownLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
import os


# Load documents
docs_path = "docs/"
all_documents = []

for root, _, files in os.walk(docs_path):
    for file in files:
        filepath = os.path.join(root, file)
        ext = file.split('.')[-1].lower()

        if ext == "txt":
            loader = TextLoader(filepath)
        elif ext == "pdf":
            loader = PyPDFLoader(filepath)
        elif ext == "csv":
            loader = CSVLoader(filepath)
        elif ext == "docx":
            loader = UnstructuredWordDocumentLoader(filepath)
        elif ext == "md":
            loader = UnstructuredMarkdownLoader(filepath)
        else:
            print(f"Skipped unsupported file type: {file}")
            continue

        docs = loader.load()
        all_documents.extend(docs)

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
split_docs = text_splitter.split_documents(all_documents)

# Embed and store in ChromaDB
embedding = OllamaEmbeddings(model="nomic-embed-text")
vectorstore = Chroma.from_documents(split_docs, embedding=embedding, persist_directory="chroma_store")

# Save the DB
vectorstore.persist()
print("Documents ingested and stored.")

