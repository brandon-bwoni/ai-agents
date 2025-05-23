from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, ToolMessage, SystemMessage, AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.tools import tool
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
import os

from dotenv import load_dotenv

load_dotenv()

llm = ChatOpenAI("gpt-4o", temperature=0)

embeddings = OpenAIEmbeddings(
  model="text-embedding-3-small"
)

pdf_path = "sample.pdf"

if not os.path.exists(pdf_path):
    raise FileNotFoundError(f"File {pdf_path} not found.")

pdf_loader = PyPDFLoader(pdf_path) 

try:
    pages = pdf_loader.load()
    print(f"PDF has been loaded and has {len(pages)} pages")
except Exception as e:
    print(f"Error loading PDF: {e}")
    raise
  
# Chunking process
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)
  
pages_split = text_splitter.split_documents(pages)

persist_directory = r"C:\Users\andre\Documents\langchain\chroma_db"
collection_name = "stock_market"

if not os.path.exists(persist_directory):
    os.makedirs(persist_directory)

try:
    vectorstore = Chroma.from_documents(
      documents=pages_split,
      embedding=embeddings,
      persist_directory=persist_directory,
      collection_name=collection_name,
    )
    print(f"Vectorstore has been created and saved to {persist_directory}")
except Exception as e:
    print(f"Error creating vectorstore: {e}")
    raise
  
# The retriever
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k":5})


@tool
def retriever_tool(query: str) -> str:
  """This tool searches and returns the information from the document"""
  
  docs = retriever.invoke(query)
  
  if not docs:
    return "No relevant information found in the document."
  
  results = []
  for i, doc in enumerate(docs):
      results.append(f"Document {i+1}:\n{doc.page_content}\n")
      

tools = [retriever_tool]

llm = llm.bind_tools(tools)

class AgentState(TypedDict):
    message: Annotated[Sequence[BaseMessage], add_messages]

def should_continue(state: AgentState):
    """"Check if the last message contains tool calls"""
    results = state["message"][-1]
    return hasattr(results, "tool_calls") and len(results.tool_calls) > 0
  
  
system_prompt = """You are a helpful assistant. Please always cite the specific parts of the documents you use in your in your answers"""


tools_dict = {our_tool.name: our_tool for our_tool in tools} # Creating a dictionary of tools

def call_llm(state: AgentState) -> AgentState:
    """Function to call the LLM with the current state"""
    messages = list(state["message"])
    messages = [SystemMessage(content=system_prompt)] + messages
    
# Retriver Agent
def take_action(state: AgentState)-> AgentState:
    """Execute tool calls from the LLM's response"""
    tool_calls = state["message"][-1].tool_calls
    result = []
    for t in tool_calls:
        print(f"Calling Tool: {t['name']} with query: {t['args'].get('query', 'No query provided')}")
        
        if not ['name'] in tools_dict:
            print(f"\nTool: {t['name']} doesn't exit.")
        else:
            result = tools_dict.get(t['name']).invoke(t['args'].get('query', ''))
            print(f"Result length: {len(str(result) )}")
            
graph = StateGraph(StateGraph)

graph.add_node("agent", call_llm)
graph.add_node("retriever_agent", take_action)

graph.add_conditional_edges(
  "llm",
  should_continue,
  {True: "retriever_agent", False: END},
)
graph.add_edge("retriever_agent", "llm")
graph.set_entry_point("llm")

rag_agent = graph.compile()

def running_agent():
    print("\n ==== RAG AGENT ====")
    
    while True:
        user_input = input("\nWhat is your question?")
        if user_input.lower() in ['exit', 'quit']:
            break
          
        messages = [HumanMessage(content=user_input)]
        
        result = rag_agent.invoke({"message": messages})
        
        print("\n=== ANSWER ===")
        print(result["message"][-1].content)
        

running_agent()
