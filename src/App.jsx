import { useEffect, useState } from 'react';
import { FileButton, Button, Text, TextInput } from '@mantine/core';
import Container from './Container';
import grafosomaIcon from './assets/grafosoma.svg'

import styles from './App.module.css';

export default function App() {
  const [file, setFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [id, setId] = useState(null)
  
  useEffect(() => {
    const reader = new FileReader()
    file && reader.readAsText(file)
    reader.addEventListener(
      "load",
      () => {
        const date = Date.now()
        fetch("https://livehouses.paoloose.site/api/session?id=" + date, {
          method: "POST",
          body: reader.result,
        });
        setId(date)
        setFileContent(JSON.parse(reader.result))
      },
      false,
    );
  }, [file])

  const fetchData = async () => {
    const response = await fetch(`https://livehouses.paoloose.site/api/session?id=${id}`);
    const data = await response.json();
    setFileContent(data);
  };

  return (
    <>
    {
      fileContent ?
      <Container file={fileContent} id={id} />
      : 
      <div className={styles.container}>
        <img src={grafosomaIcon} alt="Grafosoma" className={styles.logo} />
        <div className={styles.menu}> 
          <TextInput 
            label="Enter existing project ID"
            className={styles.input}
            value={id}
            onChange={(e) => setId(e.currentTarget.value)}
          />  
          {
            !id ? 
            <FileButton onChange={setFile} accept=".json">
              {(props) => <Button fullWidth className={styles.crearbutton} {...props} color="#303030" >
                <Text size='15px' c="#C1C2C5">
                  Or create a new one!
                </Text>  
              </Button>}
            </FileButton>
            :
            <Button fullWidth className={styles.crearbutton} onClick={fetchData} color="#303030" >
              <Text size='15px' c="#C1C2C5">
                Join
              </Text>  
            </Button>
          }
        </div>
      </div>  
    }
    </>
  )
}
