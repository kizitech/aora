import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.kizitech.aora",
  projectId: "678564470009d61d8886",
  storageId: "6785718d003887da0113",
  databaseId: "678568f60027d45b8bae",
  userCollectionId: "678569b000328a80c0f2",
  videoCollectionId: "678569e000325ef74abb",
};

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);


// export const createUser = async (email, password, username) => {
//   try {
//     const newAccount = await account.create(
//       ID.unique(),
//       email,
//       password,
//       username,
//     );

//     if (!newAccount) throw Error;

//     const avatarUrl = avatars.getInitials(username)

//     await signIn(email, password);

//     const newUser = await databases.createDocument(
//       appwriteConfig.databaseId,
//       appwriteConfig.userCollectionId,
//       ID.unique(),
//       {
//         accountIs: newAccount.$id,
//         email,
//         username,
//         avatar: avatarUrl,
//       }
//     );
//     return newUser;

//   } catch (error) {
//     console.log(error);
//     throw new Error(error);
//   }
// }

export const createUser = async (email, password, username) => {
  try {
    console.log('Starting user creation process...');

    // Create a new account
    console.log('Creating account with email:', email);
    const newAccount = await account.create(ID.unique(), email, password, username);

    if (!newAccount.$id) {
      throw new Error('Account creation failed: Missing account ID.');
    }
    console.log('Account created successfully. Account ID:', newAccount.$id);

    // Generate avatar URL
    console.log('Generating avatar URL for username:', username);
    const avatarUrl = avatars.getInitials(username);
    console.log('Avatar URL generated:', avatarUrl);

    // Sign in the user to create a session
    console.log('Signing in user with email:', email);
    await signIn(email, password);
    console.log('User signed in successfully.');

    // Create a new document in the database
    console.log('Creating document in database. Database ID:', appwriteConfig.databaseId);
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id, // Ensure correct key
        email,
        username,
        avatar: avatarUrl,
      }
    );
    console.log('Document created successfully. New User:', newUser);

    return newUser;
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  }
};


export async function signIn(email, password) {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;

  } catch (error) {
    console.log(error);
  }
}