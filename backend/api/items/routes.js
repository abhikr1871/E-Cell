const express=require('express');
const {listItems,createItem}=require('./controller');
// const uploadImage = require('../../middleware/uploadImage');
const { uploadItemImage } = require('./controller.js');

const auth=require('../../middleware/auth');

const router=express.Router();

router.get('/',auth,listItems);
router.post('/create',auth,createItem);
module.exports=router;