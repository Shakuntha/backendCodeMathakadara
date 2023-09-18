const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const upload = multer({dest: 'uploads/'});
const helmet = require('helmet');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const session = require('express-session')

const app = express();
app.use(express.json());
app.set('trust proxy', 1)
app.use(express.json())

app.use(bodyParser.urlencoded({ extended: true }))

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://products.mathakadara.com',
    'https://mathakadara.com',
    'https://dashboard.mathakadara.com'
]

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true
}));

app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(session({
    key: "user",
    secret: "secretKeyGoesHere",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: 1000 * 60 * 60 * 24, // 1 day
        secure: true,
        sameSite: 'none',
        httpOnly: true,
    }
}))

// database info
const database = {
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
}

// Cloudinary Config
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "http://gc.kis.v2.scr.kaspersky-labs.com"],
        connectSrc: ["'self'", "http://gc.kis.v2.scr.kaspersky-labs.com", "ws://gc.kis.v2.scr.kaspersky-labs.com", "http://localhost:3001"],
      },
    })
);


cloudinary.config({ 
    cloud_name: 'djoifiyzs', 
    api_key: '378211774575314', 
    api_secret: 'SOPIqvBeYb2JsU1lw1V0MQcAeYk' 
});

// Check cloudinary connection
cloudinary.api.resources({ type: 'upload'}, (error, result) => {
if(error) {
    console.log('Cloudinary connection error: ', error);
} else {
    const files = result.resources;
    console.log('Cloudinary connected. Total files in account: ', files.length);
}
});


// Check Database
const db = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

db.connect((err) => {
    if (err) {
        console.error("Errpr connecting to database", err);
        return;
    }
    console.log("Connected to database successfully!");

    db.end((err) => {
        if (err) {
            console.error("Error closing the database connection", err);
        }
        console.log("Disconnected database connection successfully!");
    });
});

// Function to handle query errors
function handleQueryError(err) {
    console.error('Error executing query:', err);
  }

// Upload Products to Database
app.post('/api/upload', upload.fields([{ name: 'cover_image'}, { name: 'image1'}, { name: 'image2'}]), async (req, res) => {
    const connection = mysql.createConnection({
        host: 'auth-db1009.hstgr.io',
        user: 'u844237779_mathakadarade',
        password: 'mathakadara@321DE',
        database: 'u844237779_mathakadarade'
    });

    try {
        const { title, redirect_link, description} = req.body;
        const stat = "active";
        console.log('Title - ',title);
        console.log('Redirect Link - ',redirect_link);
        console.log('Description - ',description);
    
        const coverImg = await cloudinary.uploader.upload(req.files['cover_image'][0].path);
        console.log("Cover Image Data -")
        console.log(coverImg);
        const { public_id: coverImgPubID, secure_url: coverImgSecureURL} = coverImg;
    
        const img1 = await cloudinary.uploader.upload(req.files['image1'][0].path);
        console.log("Image 1 - ");
        console.log(img1);
        const { public_id: img1PubID, secure_url: img1SecureURL} = img1;
    
        const img2 = await cloudinary.uploader.upload(req.files['image2'][0].path);
        console.log("Image 2 - ");
        console.log(img2);
        const { public_id: img2PubID, secure_url: img2SecureURL} = img2;
    
        const sql1 = 'INSERT INTO products (title, redirect_link, description, cover_image, image1, image2, status) VALUES (?,?,?,?,?,?,?)';
        const values1 = [title, redirect_link, description, coverImgSecureURL, img1SecureURL, img2SecureURL, stat];
    
        connection.query(sql1, values1, (err, result) => {
            if (err) {
                console.log("Failed to insert product - Table 1", err);
                res.status(500).json({ success: false, message: 'Failed to upload product - Table 1.'});
                return;
            }

            console.log("Product Inserted to Table 1",result);

            const newProductID = result.insertId;
            

            const sql2 = 'INSERT INTO avg_rating (p_id, rating) VALUES (?,?)';
            const values2 = [newProductID, 0];

            connection.query(sql2, values2, (err, result2) => {
              if(err) {
                console.log("Failed to insert product - Table 2", err);
                res.status(500).json({ success: false, message: 'Failed to upload product - Table 2.'});
                return;
              } else {
                console.log('Product inserted successfully! (Table 2)');
              }
            })

            res.status(200).json({ success: true, message: 'Product uploaded successfully!'});
            connection.end();
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Product uploading process failed.'});
    }

    connection.on('error', handleQueryError);
});

// Get Products from Database
app.get('/api/products', (req, res) => {
    const connection = mysql.createConnection({
      host: 'auth-db1009.hstgr.io',
      user: 'u844237779_mathakadarade',
      password: 'mathakadara@321DE',
      database: 'u844237779_mathakadarade'
  });

    const sql = `SELECT * FROM products`;

    connection.query(sql, (err, results) => {
        if (err) {
            console.log('Failed to retrieve products', err);
            res.status(500).json({ success: false, message: 'Failed to retrieve products.'});
            return;
        }
        console.log("Products Retrieved Successfully.")
        res.json({ success: true, data: results});
        connection.end();
    });

    connection.on('error', handleQueryError);
});

// Get Active Products from Database
app.get('/api/active/products', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
  });

  const sql = `SELECT * FROM products WHERE status = ?`;
  const stat = 'active'

  connection.query(sql, stat, (err, results) => {
      if (err) {
          console.log('Failed to retrieve products', err);
          res.status(500).json({ success: false, message: 'Failed to retrieve products.'});
          return;
      }
      console.log("Products Retrieved Successfully.")
      res.json({ success: true, data: results});
      connection.end();
  });

  connection.on('error', handleQueryError);
});

// Get Time with API
const getCountryTime = async (countryCode) => {
  try {
    const response = await axios.get(`https://timeapi.io/api/Time/current/zone?timezone=${countryCode}`);
    console.log(response.data);
    const { date, time } = response.data;
    return { date, time };
  } catch (error) {
    console.log('Error fetching country time', error);
    return null;
  }
};

const formatDateToYearMonthDate = (dateString) => {
  // Parse the input date string to a Date object
  const date = new Date(dateString);

  // Get the year, month, and date from the Date object
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1 and pad with '0' if needed
  const day = String(date.getDate()).padStart(2, '0'); // Pad with '0' if needed

  // Construct the formatted date string in "year-month-date" format
  const formattedDate = `${year}-${month}-${day}`;

  return formattedDate;
};


// Get Order
app.post('/api/inquiry/', async(req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  const { productId, productName, userName, country, email, message, phone, quantity} = req.body;
  console.log("Product ID - ",productId);
  console.log("Product Name - ",productName);
  console.log("User Name - ",userName);
  console.log("Country - ",country);
  console.log("Email - ",email);
  console.log("Message - ",message);
  console.log("Phone - ",phone);
  console.log("Quantity - ",quantity);

  getCountryTime('Asia/Colombo')
  .then((result) => {
    console.log('Date in Sri Lanka:', result.date);
    const date = result.date;
    console.log('Time in Sri Lanka:', result.time);
    const time = result.time;

    
    const inputDate = date;
    const formattedDate = formatDateToYearMonthDate(inputDate);
    console.log('Formatted Date:', formattedDate);

    const sql = `INSERT INTO orders (p_name, order_date, order_time, qty, email, customer_name, message, phone_number, view_status, p_id, country) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
    const values = [productName ,formattedDate, time, quantity, email, userName, message, phone, 'active', productId, country];
  
    connection.query(sql, values, (err, result) => {
      if (err) {
        console.log("Failed to insert order", err);
        res.status(500).json({ success: false, message: 'Failed to insert order.'});
        return;
      }
  
      console.log('Order inserted successfully!');
      res.status(200).json({ success: true, message: 'Order inserted successfully!'});
      connection.end();
    });
  })
  .catch((error) => {
    console.log('Error:', error);
  });

  connection.on('error', handleQueryError);
});

// Not Sure About These Queries. (Currently Testing Only)
// Get Active Orders
app.get('/api/orders', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
}); 

  const sql = "SELECT * FROM orders";
  connection.query(sql, (err, results) => {
    if (err) {
      console.log('Failed to retrieve orders', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve orders.'});
      return;
    }
    console.log("Orders Retrieved Successfully.")
    res.json({ success: true, data: results});
    connection.end();
  });

  connection.on('error', handleQueryError);
});

// Get Canceled Orders
app.get('/api/orders/canceled', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  const sql = "SELECT * FROM orders WHERE view_status = ?";
  const stat = 'canceled';
  connection.query(sql, stat, (err, results) => {
    if (err) {
      console.log('Failed to retrieve cancelled orders', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve orders.'});
      return;
    }
    console.log("Cancelled Orders Retrieved Successfully.")
    res.json({ success: true, data: results});
    connection.end();
  });

  connection.on('error', handleQueryError);
});

// Get Completed Orders
app.get('/api/orders/completed', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  const sql = "SELECT * FROM orders WHERE view_status = ?";
  const stat = 'completed';
  connection.query(sql, stat, (err, results) => {
    if (err) {
      console.log('Failed to retrieve cancelled orders', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve orders.'});
      return;
    }
    console.log("Cancelled Orders Retrieved Successfully.")
    res.json({ success: true, data: results});
    connection.end();
  });

  connection.on('error', handleQueryError);
});

// Delete Orders
app.delete('/api/orders/delete/:orderId', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
}); 

  console.log("Order Delete Process...");

  const OrderID = req.params.orderId;
  console.log("Order ID - ",OrderID);

  const sql = `DELETE FROM orders WHERE o_id = ?`;
  const values = [OrderID];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.log("Failed to delete order", err);
      res.status(500).json({ success: false, message: 'Failed to delete order.'});
      return;
    }

    console.log('Order deleted successfully!');
    res.status(200).json({ success: true, message: 'Order deleted successfully!'});
    connection.end();
  });
});

// Cancel Order
app.put('/api/orders/cancel/:orderId', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  console.log("Canceling Order...");

  const orderID = req.params.orderId;
  console.log("Order ID - ",orderID);

  const sql = `UPDATE orders SET view_status = ? WHERE o_id = ?`;
  const values = ['canceled', orderID];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.log("Failed to cancel order", err);
      res.status(500).json({ success: false, message: 'Failed to cancel order.'});
      return;
    }

    console.log('Order canceled successfully!');
    res.status(200).json({ success: true, message: 'Order canceled successfully!'});
    connection.end();
  });
});

// Complete Order
app.put('/api/orders/complete/:orderId', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  console.log("Completing Order...");

  const orderID = req.params.orderId;
  console.log("Order ID - ",orderID);

  const sql = `UPDATE orders SET view_status = ? WHERE o_id = ?`;
  const values = ['completed', orderID];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.log("Failed to complete order", err);
      res.status(500).json({ success: false, message: 'Failed to complete order.'});
      return;
    }

    console.log('Order completed successfully!');
    res.status(200).json({ success: true, message: 'Order completed successfully!'});
    connection.end();
  });
});

// Restore Order
app.put('/api/orders/restore/:orderId', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  console.log("Restoring Order...");

  const orderID = req.params.orderId;
  console.log("Order ID - ",orderID);

  const sql = `UPDATE orders SET view_status = ? WHERE o_id = ?`;
  const values = ['active', orderID];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.log("Failed to restore order", err);
      res.status(500).json({ success: false, message: 'Failed to restore order.'});
      return;
    }

    console.log('Order restored successfully!');
    res.status(200).json({ success: true, message: 'Order restored successfully!'});
    connection.end();
  });
});


// Get Inactive Products from Database
app.get('/api/Inactiveproducts', (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  const sql = `SELECT * FROM products WHERE status = ?`;
  const stat = 'inactive'

  connection.query(sql, stat, (err, results) => {
      if (err) {
          console.log('Failed to Retrieve Inactive Products', err);
          res.status(500).json({ success: false, message: 'Failed to Retrieve Inactive Products.'});
          return;
      }
      console.log("Inactive Products Retrieved Successfully.")
      res.json({ success: true, data: results});
      connection.end();
  });

  connection.on('error', handleQueryError);
});

// Delete Inactive Product
app.delete('/api/products/delete/:productId', async (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  const productID = req.params.productId;
  console.log("Deleting Product ID - ", productID);

  const { cImgURL, Img1URL, Img2URL } = req.body;
  console.log("Delete URL for Cover Image - ", cImgURL);
  console.log("Delete URL for Image 1 - ", Img1URL);
  console.log("Delete URL for Image 2 - ", Img2URL);

  const sql1 = `DELETE FROM ratings WHERE p_id = ?`;
  const sql2 = `DELETE FROM avg_rating WHERE p_id = ?`;
  const sql3 = `DELETE FROM products WHERE p_id = ?`;
  const sql4 = `DELETE FROM orders WHERE p_id = ?`
  const values = [productID];

  try {
    // Begin the database transaction
    connection.beginTransaction();

    // Execute the first query to delete from the ratings table
    connection.query(sql1, values, (err, result) => {
      if (err) {
        throw err;
      }
      console.log("Product Ratings Deleted Successfully!");
    });

    // Execute the second query to delete from the avg_rating table
    connection.query(sql2, values, (err, result) => {
      if (err) {
        throw err;
      }
      console.log("Average Ratings Deleted Successfully!");
    });

    // Delete Cover Image if URL is provided
    if (cImgURL) {
      await cloudinary.uploader.destroy(getPublicIdFromUrl(cImgURL));
      console.log("Cover Image Deleted.");
    } else {
      console.log("Failed to Delete Cover Image.");
    }

    // Delete Image 1 if URL is provided
    if (Img1URL) {
      await cloudinary.uploader.destroy(getPublicIdFromUrl(Img1URL));
      console.log("Image 1 Deleted.");
    } else {
      console.log("Failed to Delete Image 1.");
    }

    // Delete Image 2 if URL is provided
    if (Img2URL) {
      await cloudinary.uploader.destroy(getPublicIdFromUrl(Img2URL));
      console.log("Image 2 Deleted.");
    } else {
      console.log("Failed to Delete Image 2.");
    }

    // Execute the third query to delete all associated orders
    connection.query(sql4, values, (err, result) => {
      if (err) {
        throw err;
      }
      console.log("Associated Orders Deleted Successfully!")
    })

    // Execute the fourth query to delete from the products table
    connection.query(sql3, values, (err, result) => {
      if (err) {
        throw err;
      }
      console.log("Product Deleted Successfully!");
    });

    // Commit the transaction if all queries are successful
    connection.commit((err) => {
      if (err) {
        throw err;
      }
      console.log("All queries were successful. Transaction committed.");
      res.json({ success: true, message: 'Product and related data deleted successfully!' });
      connection.end();
    });
  } catch (err) {
    // If any query fails, rollback the transaction to maintain data consistency
    connection.rollback(() => {
      console.log("An error occurred. Transaction rolled back.", err);
      res.json(500).json({ success: false, message: 'Failed to delete product and related data.' });
      connection.end();
    });
  }
});



// Get Specific Product
app.get('/api/product/:productId', async (req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

    const productID = req.params.productId;
    console.log("Product ID - ",productID);

    const sql = `SELECT * FROM products WHERE p_id = ?`;

    connection.query(sql, [productID], async (err, result) => {
        if (err) {
            console.log('Failed to retrieve product ',err);
            res.json(500).json({ success: false, message: 'Failed to retrieve product.'});
            return;
        }
        console.log("Product Retrieved Succeessfully!")
        res.json({ success: true, data: result});
        connection.end();
    });

    connection.on('error', handleQueryError);
});

// Make Product Inactive
app.put('/api/products/inactive/:productUID', async(req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

    console.log("Product Inactive Process...");
    const updatePID = req.params.productUID;
    const { status } = req.body;
    console.log(updatePID);
    console.log(status);

    const sql = `UPDATE products SET status = ? WHERE p_id = ?`;
    connection.query(sql, [status, updatePID], async (err, result) => {
        if (err) {
            console.log('Error Deactivating Product', err);
            res.status(500).json({ success: false, message: 'Failed to Disable Product.'});
            return;
        }
        res.json({ success: true, message: "Product Successfully Deactivated."});
        connection.end();
    });

    connection.on('error', handleQueryError);
});

// Make Product Active
app.put('/api/products/restore/:productID', async(req, res) => {
  const connection = mysql.createConnection({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
});

  console.log("Product Active Process...");
  const restorePID = req.params.productID;
  console.log(restorePID);
  const { status } = req.body;
  console.log(status);

  const sql = `UPDATE products SET status = ? WHERE p_id = ?`;
  const values = [status, restorePID];

  connection.query(sql, values, async (err, result) => {
      if (err) {
          console.log('Error Activating Product', err);
          res.status(500).json({ success: false, message: 'Failed to Enable Product.'});
          return;
      }
      res.json({ success: true, message: "Product Successfully Activated."});
      connection.end();
  });
  
  connection.on('error', handleQueryError);
});


// Product Update
// Create a connection pool
const pool = mysql.createPool({
    host: 'auth-db1009.hstgr.io',
    user: 'u844237779_mathakadarade',
    password: 'mathakadara@321DE',
    database: 'u844237779_mathakadarade'
  });
  
  app.put('/api/productUpdate/:productEditID', upload.fields([{ name: 'cover_image' }, { name: 'image1' }, { name: 'image2' }]), async (req, res) => {
    console.log('Updating Product...');
    const productID = req.params.productEditID;
    console.log(productID);
    const { title, redirect_link, description } = req.body;
    console.log('Title - ', title);
    console.log('Redirect Link - ', redirect_link);
    console.log('Description - ', description);

    let connection;
  
    try {
      connection = await new Promise((resolve, reject) => {
        pool.getConnection((error, connection) => {
          if (error) {
            reject(error);
          } else {
            resolve(connection);
          }
        });
      });
  
      await connection.beginTransaction();

      const getProductQuery = `SELECT * FROM products WHERE p_id = ?`;
      const getProductValues = [productID];

      let productData;
      try {
        productData = await new Promise((resolve, reject) => {
          connection.query(getProductQuery, getProductValues, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results[0]); // Retrieve the first row of the results
            }
          });
        });
        console.log("Product Data Fetched Successfully", productData);
      } catch (error) {
        console.log("Failed to Fetch Product Data", error);
        return res.status(500).json({ success: false, message: "Failed to Retrieve Product."});
      }
  
      const updateProductQuery = 'UPDATE products SET title = ?, redirect_link = ?, description = ? WHERE p_id = ?';
      const updateProductValues = [title, redirect_link, description, productID];
  
      try {
        await new Promise((resolve, reject) => {
          connection.query(updateProductQuery, updateProductValues, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });
  
        console.log("Product Text Data Updated Successfully");
      } catch (error) {
        await connection.rollback();
        console.log("Failed to Update Product Text Data", error);
        return res.status(500).json({ success: false, message: "Failed to update product text data." });
      }

      // Upload New Uploaded
      const fullFiles = req.files;
      console.log(fullFiles);
      const coverImage = req.files['cover_image'];
      const image1 = req.files['image1'];
      const image2 = req.files['image2'];

      console.log(coverImage);
      console.log(image1);
      console.log(image2);

      const oldCoverImgURL = productData.cover_image;
      console.log('Cover Image URL - ',oldCoverImgURL);

      const oldImage1 = productData.image1;
      console.log('Image 1 URL - ',oldImage1);

      const oldImage2 = productData.image2;
      console.log('Image 2 URL - ',oldImage2);

      if (coverImage && coverImage.length > 0) {
        try {
          console.log("New Cover Image Uploading...");
          const coverImageResult = await cloudinary.uploader.upload(coverImage[0].path);
          console.log(coverImageResult);
          const coverImgURL = coverImageResult.secure_url;
  
          const coverImageQuery = `UPDATE products SET cover_image = ? WHERE p_id = ?`;
          const coverImageValue = [coverImgURL, productID];

          if (oldCoverImgURL) {
            await cloudinary.uploader.destroy(getPublicIdFromUrl(oldCoverImgURL));
            console.log("Old Cover Image Deleted from Cloud.");
          } else {
            console.log("Old Cover Image Failed to Delete.");
          }
  
          await new Promise((resolve, reject) => {
            connection.query(coverImageQuery, coverImageValue, (error, results) => {
              if (error) {
                reject(error);
              } else {
                resolve(results);
              }
            });
          });
        } catch (error) {
          await connection.rollback();
          console.log("Failed to Upload New Cover Image", error);
          return res.status(500).json({ success: false, message: "Failed to upload new cover image." });
        }
      } else {
        console.log("New Cover Image Not Available...")
      }

      // Check Image 1
      if (image1 && image1.length > 0) {
        try {
          console.log("Updating New Image 1...");
          const image1Result = await cloudinary.uploader.upload(image1[0].path);
          console.log(image1Result);
          const image1URL = image1Result.secure_url;

          const image1ImageQuery = `UPDATE products SET image1 = ? WHERE p_id = ?`;
          const image1ImageValue = [image1URL, productID];

          if(oldImage1) {
            await cloudinary.uploader.destroy(getPublicIdFromUrl(oldImage1));
            console.log("Old Image 1 Deleted From Cloud");
          } else {
            console.log("Old Image 1 Failed to Delete.");
          }
          await new Promise((resolve, reject) => {
            connection.query(image1ImageQuery, image1ImageValue, (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            });
          });
        } catch (error) {
          await connection.rollback();
          console.log("Failed to Upload New Image 1", error);
          return res.status(500).json({ success: false, message:"Failed to Upload New Image 1" });
        }
      } else {
        console.log("New Image 1 Not Available");
      }

      // Check Image 2
      if (image2 && image2.length > 0) {
        try {
          console.log("Updating New Image 2...");
          const image2Result = await cloudinary.uploader.upload(image2[0].path);
          console.log(image2Result);
          const image2URL = image2Result.secure_url;

          const image2ImageQuery = `UPDATE products SET image2 = ? WHERE p_id = ?`;
          const image2ImageValue = [image2URL, productID];

          if (oldImage2) {
            await cloudinary.uploader.destroy(getPublicIdFromUrl(oldImage2));
            console.log("Old Image 2 Deleted From Cloud");
          } else {
            console.log("Old Image 2 Failed to Delete.")
          }
          await new Promise((resolve, reject) => {
            connection.query(image2ImageQuery, image2ImageValue, (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            });
          });
        } catch (error) {
          await connection.rollback();
          console.log("Failed to Upload New Image 2", error);
          return res.status(500).json({ success: false, message: "Failed to Upload New Image 2"});
        }
      } else {
        console.log("New Image 2 Not Available.")
      }
  
      await connection.commit();
      console.log("Product Details and Images Updated Successfully!");
      res.json({ success: true, message: "Product Details and Images Updated Successfully!" });
    } catch (error) {
      console.log("Failed to Update Product Details and Images.", error);
      return res.status(500).json({ success: false, message: "Failed to update product details and images." });
    } finally {
      if (connection) {
        connection.release((err) => {
          if (err) {
            console.error('Error releasing the database connection:', err);
          } else {
            console.log('Database connection released successfully.');
          }
        });
      }
    }
  });

function getPublicIdFromUrl(url) {
  // Extract public_id from the Cloudinary URL
  const startIndex = url.lastIndexOf("/") + 1;
  const endIndex = url.lastIndexOf(".");
  return url.substring(startIndex, endIndex);
}

app.post('/createadmin', async (req, res) => {
  var Values = []
  console.log(req.body.password)
  // hash password
  try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
      Values = [
          req.body.username,
          hashedPassword
      ]
  } catch (error) {
      console.log(error)
  }
  console.log(Values)

  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = "INSERT INTO user (`username`, `password`) VALUES (?)"

  db.query(sql,[Values], (err, data) => {
      if (err) {
        console.error(`Query failed:`, err);
      } else {
          console.log('query executed')
      }

      db.on('error', handleQueryError);
      db.end()
  });
})

app.post('/auth/login', (req, res) => {
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };
  console.log(req.body.username)

  const sql = 'SELECT * FROM `user` WHERE `username` = ?'

  db.query(sql, [req.body.username], (err, data) => {
      if (err) {
          console.log(err)
          return res.json('Error')
      } 
      console.log(data)

      if (data.length > 0) {
          bcrypt.compare(req.body.password, data[0].password, (err, response) => {
              if (response) {
                  console.log('password correct')
                  req.session.isLoggedIn = true
                  req.session.username = data[0].username
                  return res.json({ loggedIn: true })
              } else {
                  console.log('password incorrect')
                  return res.json({ loggedIn: false })
              }
          })
      } else {
          console.log('user does not exist')
          return res.json({ wrongUsername: true})
      }
  })
  db.on('error', handleQueryError);
  db.end()
})

app.get('/auth/loginstatus', (req, res ) => {
  const isLoggedIn = req.session.isLoggedIn || false
  return res.json({ loggedIn: isLoggedIn})
})


app.get('/getproducts', (req, res) => {
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = 'SELECT `products`.`p_id`, `title`, `cover_image`, `avg_rating`.`rating` FROM `products` RIGHT JOIN `avg_rating` ON `products`.`p_id` = `avg_rating`.`p_id`'

  db.query(sql, (err, data) => {
      if (err) {
          console.log(err)
          return res.json('Error')
      } 
      if (data.length > 0) {
          console.log(data)
          return res.json(data)
      }
  })
  db.on('error', handleQueryError);
  db.end()
})


app.get('/product/:id', (req, res) => {
  console.log('works')
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = 'SELECT * FROM `products` RIGHT JOIN `avg_rating` ON `products`.`p_id` = `avg_rating`.`p_id` WHERE `products`.`p_id` = ?'

  db.query(sql,[req.params.id], (err, data) => {
      if (err) {
          console.log(err)
          return res.json('Error')
      } 
      if (data.length > 0) {
          console.log(data)
          return res.json(data)
      }
  })
  db.on('error', handleQueryError);
  db.end()
})

app.post('/product/inquire', (req, res) => {
  console.log(req.body)
  return res.json('success')
})

app.post('/comment/new' ,(req, res) => {
  console.log(req.body)
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = 'INSERT INTO `ratings` (`p_id`, `name`, `stars`, `description`) VALUES(?)'
  const Values = [
      req.body.productId,
      req.body.commentName,
      req.body.rating,
      req.body.comment
  ]

  db.query(sql, [Values], (err, data) => {
      if (err) {
          console.log(err)
          return res.json('Error')
      } else {
          avgrating(req.body.productId)
          return res.json('success')
      }
  })
  db.on('error', handleQueryError);
  db.end()
})


app.get('/comment/get/:id', (req, res) => {
  const productId = req.params.id
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = "SELECT * FROM `ratings` WHERE `p_id` = ?"

  db.query(sql, [productId], (err, data) => {
      if (err) {
          console.log(err)
          return res.json('Error')
      } else {
          return res.json(data)
      }
  })
  db.on('error', handleQueryError);
  db.end()
})

const avgrating = (productId) => {
  console.log('calculate average rating')
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })
  let sum = 0

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = "SELECT `stars` FROM `ratings` WHERE `p_id` = ?"

  db.query(sql, [productId], (err, data) => {
      if (err) {
          console.log(err)
      } else {
          for (let i =0; i < data.length; i++) {
              sum += data[i].stars
          }
          const avg = sum / data.length
          console.log(Math.round(avg))
          updateRating(Math.round(avg),productId)
      }
  })

  db.on('error', handleQueryError);
  db.end()
}

const updateRating = (avg,productId) => {
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })
  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = "Update `avg_rating` SET `rating` = ? WHERE `p_id` = ?"
  db.query(sql, [avg,productId], (err, data) => {
      if (err) {
          console.log(err)
      } else {
          console.log('updated')
      }
  })
  
  db.on('error', handleQueryError);
  db.end()
}

app.get('/comments/getdata', (req, res) => {
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };
  
  const sql = 'SELECT ratings.r_id, ratings.p_id, ratings.name, ratings.stars, products.title FROM `ratings` INNER JOIN products ON ratings.p_id = products.p_id ORDER BY ratings.r_id DESC'

  db.query(sql, (err, data) => {
      if (err) {
          console.log(err)
          return res.json('Error')
      } else {
          return res.json(data)
      }
  })

  db.on('error', handleQueryError);
  db.end()
})

app.get('/comments/getdata/:id', (req, res) => {
  const id = req.params.id
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = `SELECT ratings.r_id, ratings.name, ratings.stars, ratings.description, products.title FROM ratings INNER JOIN products ON ratings.p_id = products.p_id WHERE r_id = ${id}`

  db.query(sql, (err, data) => {
      if(err) {
          console.log(err)
          return res.json("error")
      } else {
          console.log(data)
          return res.json(data)
      }
  })

  db.on('error', handleQueryError);
  db.end()
})

app.delete('/comments/delete/:id', (req, res) => {
  const id = req.params.id

  const db = mysql.createConnection({
    host: database.host,
    user: database.user,
    password: database.password,
    database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = `DELETE FROM ratings WHERE r_id = ${id}`

  db.query(sql, (err, data) => {
    if(err) {
        console.log(err)
        return res.json("error")
    } else {
        avgrating(id)
        console.log('deleted')
        return res.json('deleted')
    }
  })

  db.on('error', handleQueryError);
  db.end()
})

app.get('/products/getnames', (req, res) => {
  const db = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database
  })

  const handleQueryError = (error) => {
      console.error('An error occurred while executing the query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
  };

  const sql = "SELECT p_id, title FROM products"

  db.query(sql, (err, data) => {
      if (err) {
          console.log(err)
          return res.json('Error')
      } else {
          return res.json(data)
      }
  })
  
  db.on('error', handleQueryError);
  db.end()
})


const port = 5001;
app.listen(port, () => {
    console.log("Listening to port: ", port);
});