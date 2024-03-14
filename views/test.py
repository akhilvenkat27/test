import openai
openai.api_type = "azure"
openai.api_base = "https://skill-ont.openai.azure.com/"
openai.api_version = "2022-12-01"
openai.api_key = "1676a0813fa646f8af1b1badf8bb2b47"
invtext="""my name is 
"""
prompt=invtext
max_tokens = 500
temperature = 0.8
 
response = openai.Completion.create(
engine="ocr-test",
prompt=prompt,
max_tokens=max_tokens,
temperature=temperature
)
 
generated_text = response.choices[0].text.strip()
 
 
print(generated_text)