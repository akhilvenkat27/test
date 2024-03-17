#Note: The openai-python library support for Azure OpenAI is in preview.
import os
from openai import AzureOpenAI
import sys
import json

# Read the serialized data from command-line arguments
serialized_data = sys.argv[1]
data_received = json.loads(serialized_data)

client = AzureOpenAI(
  azure_endpoint = "https://skill-ont.openai.azure.com/", 
  api_key="1676a0813fa646f8af1b1badf8bb2b47",  
  api_version="2024-02-15-preview"
)


message_text = [{"role":"system","content":data_received}]

completion = client.chat.completions.create(
  model="skills_ont", 
  messages = message_text,
  temperature=0.5,
  max_tokens=800,
  top_p=0.95,
  frequency_penalty=0,
  presence_penalty=0,
  stop=None
)

ans = str(completion.choices[0])
st = ans.find("content")+9
end = ans.find("assistant")-9
ans = ans[st:end]

print(ans)


