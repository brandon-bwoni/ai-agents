from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, ToolMessage, SystemMessage, AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

load_dotenv()

# This is a global variable to store document content
document_content = ""

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    

@tool
def update(content: str) -> str:
    """Updates the document with the provided content."""
    global document_content
    document_content = content
    return f"Document has been updated successfully! The current content is:\n{document_content}"
  
@tool
def save(filename: str) -> str:
    """Saves the currect document to a text file and finish the process.
    
    Args:
      filename: Name of the text file
    """
    global document_content
    
    if not filename.endswith(".txt"):
        filename = f"{filename}.txt"

    try:
        with open(filename, "w") as file:
            file.write(document_content)
        print(f"Document has been saved successfully to: {filename}!")
        return f"Document has been saved successfully to: {filename}!"
    except Exception as e:
        print(f"Error saving document: {e}")
        
tools = [update, save]

model = ChatOpenAI(model = "gpt-4o").bind_tools(tools)

def our_agent(state: AgentState) -> AgentState:
    system_prompt = SystemMessage(content=f"""You are Drafter, a helpful writing assistant. 
                                  You are going to help the user update and modify documents.
        
      -If the user wants to update or modify content, use the 'update' tool with complete updated content.
      -If the user wants to save and finish, you need to use the 'save' tool.
      - Make sure to always show the current document state after modications.
      
      The current document content is: {document_content}                        
    """)
    
    if not state["messages"]:
        print("I'm ready to help you update a document. What would you like to create?")
    
    user_input = input("\nWhat would you like to do with the document? ")
    print(f"\n USER: {user_input}")
    user_message = HumanMessage(content=user_input)
        
    all_messages = [system_prompt] + list(state["messages"]) + [user_message]
    
    response = model.invoke(all_messages)
    print(f"\n🤖 AI: {response.content}")
    if hasattr(response, "tool_calls") and response.tool_calls:
        print(f"🔧 USING TOOL: {[tc['name'] for tc in response.tool_calls]}")
        
    return {"messages": list(state["messages"]) + [user_message, response]}


def should_continue(state: AgentState) -> str:
    """Check if we should continue or end the conversation."""
    messages = state["messages"]
    if not messages:
        return "continue"
    
    # This looks for the most recent recent tool message...
    for message in reversed(messages):
        #...and checks if it was a tool message resulting from save
        if(isinstance(message, ToolMessage) and
       "saved" in message.content.lower() and
       "document" in message.content.lower()
       ):
            return "end" # goes to the end which leads to the endpoint
    return "continue" # if no tool message was found, we continue the conversation

def print_messages(messages):
    """"Function to print the messages in a readable format."""
    if not messages:
        return
    
    for msg in messages[-3:]:
        if isinstance(msg, ToolMessage):
            print(f"\n🛠 TOOL RESULT: {msg.content}")

graph = StateGraph(AgentState)

graph.add_node("agent", our_agent)
graph.add_node("tools", ToolNode(tools))

graph.set_entry_point("agent")

graph.add_edge("agent", "tools")

graph.add_conditional_edges(
    "tools",
    should_continue,
    {
        "continue": "agent",
        "end": END,
    }
)

app = graph.compile()

def run_document_agent():
    print("\n ==== DRAFTER ====")
    
    state = {"messages": []}
    
    for step in app.stream(state, stream_mode="values"):
        if "messages" in step:
            print_messages(step["messages"])
    
    print("\n ==== DRAFTER FINISHED ====")
    

if __name__ == "__main__":
    run_document_agent()