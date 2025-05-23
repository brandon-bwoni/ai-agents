from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage # The foundational class for all message types in LangGraph
from langchain_core.messages import ToolMessage # Passes data back to LLM after it calls a tool such as the content and the result
from langchain_core.messages import SystemMessage # Message for providing instrunctions to the LLM 
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

load_dotenv()

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    

@tool
def add(a: int, b: int):
    """Adds two numbers together."""
    return a + b
  

@tool
def subtract(a: int, b: int):
    """Subtracts two numbers"""
    return a - b

@tool
def multiply(a: int, b: int):
    """Multiplies two numbers"""
    return a * b
  
tools = [add, subtract, multiply]

model = ChatOpenAI(model = "gpt-4o").bind_tools(tools)


def model_call(state: AgentState) -> AgentState:
    """Call the model with the current state."""
    system_prompt = SystemMessage(
        content="You are my AI assistant, please answer my query to the best of your ability."
    )
    response = model.invoke([system_prompt] + state["messages"])
    return {"messages": [response]}


def should_continue(state: AgentState):
    """Determine if the agent should continue."""
    message = state["messages"]
    last_message = message[-1] 
    if not last_message.tool_calls:
        return "end"
    
    else:
        return "continue"
    
graph = StateGraph(AgentState)
graph.add_node("our_agent", model_call)

tool_node = ToolNode(tools=tools)
graph.add_node("tool", tool_node)

graph.set_entry_point("our_agent")

graph.add_conditional_edges(
    "our_agent",
    should_continue,
    {
        "continue": "tool",
        "end": END,
    },
)

graph.add_edge("tool", "our_agent")

app = graph.compile()

def print_stream(stream):
    for s in stream:
        message = s["messages"][-1] 
        if isinstance(message, tuple):
            print(message)
        else:
            message.pretty_print()
            
inputs = {"messages": [("user", "Add 40 + 12, Subtract 48 - 12, Multiply 4 * 5. Also tell me a joke about math.")]}

print_stream(app.stream(inputs, stream_mode="values"))