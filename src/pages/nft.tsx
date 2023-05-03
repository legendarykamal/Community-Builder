// @ts-nocheck
import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { useContract } from 'wagmi';
import axios from 'axios';
import { Box, Button, Input, Spinner, Image, Text, Link } from '@chakra-ui/react';
import { ethers } from 'ethers';

// ABIs
import NFT from '../abis/CreatorNFT.json';

// Config


function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [nft, setNFT] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [url, setURL] = useState(null);

  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);

  const loadBlockchainData = async () => {
    setProvider(provider);

    const nftContract = useContract("0x983f1200Af39AC6095FF6DaD829c266ADC5B5Cbf", NFT);
    console.log(nft);
    console.log(nftContract," nftContract");
    setNFT(nftContract);
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (name === "" || description === "") {
      window.alert("Please provide a name and description");
      return;
    }

    setIsWaiting(true);

    // Call AI API to generate an image based on description
    const imageData = await createImage();

    // Upload image to IPFS (NFT.Storage)
    const url = await uploadImage(imageData);

    // Mint NFT
    await mintImage(url);

    setIsWaiting(false);
    setMessage("");
  };


  const createImage = async () => {
    setMessage("Generating Image...")

    // You can replace this with different model API's
    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`

    // Send the request
    const response = await axios({
      url: URL,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        inputs: description, options: { wait_for_model: true },
      }),
      responseType: 'arraybuffer',
    })

    const type = response.headers['content-type']
    const data = response.data;
    console.log(data);

    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data // <-- This is so we can render it on the page
    setImage(img)

    return data
  }

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...")

    // Create instance to NFT.Storage
    const nftstorage = new NFTStorage({ token: process.env.NEXT_PUBLIC_NFTSTORAGE_API_KEY })

    // Send request to store image
    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })

    // Save the URL
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`  
    setURL(url)

    return url
  }

  const mintImage = async (tokenURI) => {
    setMessage("Waiting for Mint...")

    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") })
    await transaction.wait()
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <Box>
      <Box className='form' p={4}>
        <form onSubmit={submitHandler}>
          <Input
            type="text"
            placeholder="Create a name..."
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <Input
            type="text"
            placeholder="Create a description..."
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button mt={2} colorScheme="blue" type="submit" disabled={isWaiting}>
            Create & Mint
          </Button>
        </form>

        <Box className="image" mt={4}>
          {!isWaiting && image ? (
            <Image src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <Box className="image__placeholder" textAlign="center">
              <Spinner color="blue.500" size="lg" />
              <Text mt={2}>{message}</Text>
            </Box>
          ) : null}
          <Image src={image} alt="AI generated image" />
        </Box>
      </Box>

      {!isWaiting && url && (
        <Text mt={2}>
          View&nbsp;
          <Link href={url} isExternal>
            Metadata
          </Link>
        </Text>
      )}
    </Box>
  );
}

export default App;

