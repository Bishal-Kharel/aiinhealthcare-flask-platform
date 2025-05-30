# 📚 Dataset Catalogue

## 1. MedQuAD (Medical Question Answering Dataset)

- **Source:** [MedQuAD - NIH](https://www.nlm.nih.gov/databases/download/medquad.html)
- **License:** Public Domain (U.S. Government Work)
- **Description:** A collection of over 45,000 question-answer pairs from NIH medical institutes covering a wide range of health topics.
- **Format:** XML files (parsed into Q&A text)
- **Usage:** Ingested into Vector DB for retrieval-augmented generation (RAG) in the AI Health Assistant.

## Notes

- Cleaned and parsed using a custom XML parser (`scripts/ingest.py`).
- Embedded using the `nomic-embed-text` model and stored in ChromaDB.
