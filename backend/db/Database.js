
const mongoose=require("mongoose")
const connectDatabase=()=>{

    const mongoUrl = process.env.MONGO_URL;
console.log("MongoDB URL:", mongoUrl); // Add this line for debugging

// Define the database connection function
mongoose.connect(mongoUrl).then((data) => {
  console.log(`MongoDb connected with server: ${data.connection.host} `);
});
}
module.exports=connectDatabase;