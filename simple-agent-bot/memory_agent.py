from typing import TypedDict, List,Union
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv


load_dotenv()

class AgentState(TypedDict):
    messages: List[Union[HumanMessage, AIMessage]]

llm = ChatOpenAI(model="gpt-4o")

# Define node within a function
def process(state: AgentState) -> AgentState:
    """This node will solve the request you input"""
    response = llm.invoke(state["messages"])
    
    state["messages"].append(AIMessage(content=response.content))
    
    print(f"\nAI: {response.content}")
    return state
  
# Define the state graph
graph = StateGraph(AgentState)
graph.add_node("process", process)
graph.add_edge(START, "process")
graph.add_edge("process", END)
agent = graph.compile()


conversation_history = []

user_input = input("Enter: ")
while user_input.lower() != "exit":
    conversation_history.append(HumanMessage(content=user_input))
    
    result = agent.invoke({"messages": conversation_history})
  
    # print(result["messages"])
    conversation_history = result["messages"]
    
    user_input = input("Enter: ")
    

# Save the conversation history to a text file
with open("logging.txt", "w") as file:
    file.write("You Conversation Log:\n")
    for message in conversation_history:
        if isinstance(message, HumanMessage):
            file.write(f"You: {message.content}\n")
        elif isinstance(message, AIMessage):
            file.write(f"AI: {message.content}\n")
    file.write("End of Conversation Log\n")
    
print("Conversation history saved to loggin.txt")