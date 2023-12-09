import { useCallback, useEffect, useState } from 'react';
import { FileButton, Button, Text } from '@mantine/core';
import { useDropzone } from 'react-dropzone';
import { BsFillPeopleFill } from "react-icons/bs";
import { PiPopcornFill } from "react-icons/pi";
import customers from './datasets/customers.json';
import films from './datasets/films.json';
import Container from './Container';
import grafosomaIcon from './assets/grafosoma.svg'

import styles from './App.module.css';

export default function App() {
  const [file, setFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0])
  }, [])
  
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop})

  useEffect(() => {
    const reader = new FileReader()
    file && reader.readAsText(file)
    reader.addEventListener(
      "load",
      () => { setFileContent(JSON.parse(reader.result)) },
      false,
    );
  }, [file])

  return (
    <>
    {
      fileContent ?
      <Container file={fileContent} />
      : 
      <div className={styles.main}>
        <div className={styles.container}>
          <img src={grafosomaIcon} alt="Grafosoma" className={styles.logo} />
          <div className={styles.menu}>
            <FileButton onChange={setFile} accept=".json">
              {(props) => <Button fullWidth className={styles.crearbutton} {...props} color="#303030" >
                <Text size='15px' c="#C1C2C5">
                  Choose JSON file
                </Text>  
              </Button>}
            </FileButton>
            <div className={styles.examples}>
              <Text size='15px' c="#C1C2C5">
                Or use a sample dataset
              </Text>
              <div className={styles.exbuttons}>
                <Button color="#303030" fullWidth onClick={() => setFileContent(customers)}>
                  <BsFillPeopleFill />
                </Button>
                <Button color="#303030" fullWidth onClick={() => setFileContent(films)}>
                  <PiPopcornFill />
                </Button>
              </div>
            </div>
          </div>
        </div>  
      </div>
    }
    </>
  )
}
