from typing import TypedDict, List
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv


load_dotenv()

class AgentState(TypedDict):
    messages: List[HumanMessage]
    
    
llm = ChatOpenAI(model="gpt-4o")

# Define node within a function
def process(state: AgentState) -> AgentState:
    """Node function to invoke the LLM."""
    response = llm.invoke(state["messages"])
    print(f"\nAI: {response.content}")
    return state


# Define the state graph
graph = StateGraph(AgentState)
graph.add_node("process", process)
graph.add_edge(START, "process")
graph.add_edge("process", END)
agent = graph.compile()


user_input = input("Enter: ")
while user_input.lower() != "exit":
    agent.invoke({"messages": [HumanMessage(content=user_input)]})
    user_input = input("Enter: ")