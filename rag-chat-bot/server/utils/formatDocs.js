function formatDocuments(docs) {
  return docs.map((doc) => doc.pageContent).join('\n\n');
}


export { formatDocuments };