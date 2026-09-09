const express = require("express");
const requestRouter = express.Router();
const {userAuth} = require('../middlewares/auth');
const ConnectionRequestModel = require('../models/connectionRequest');
const User = require('../models/user');
const sendEmail = require('../utils/sendEmail');

// api for sending connection request to another user
requestRouter.post("/request/send/:status/:toUserId", userAuth, async(req, res) => {
    try{
        const fromUserId = req.user._id;
        const toUserId = req.params.toUserId;
        const status = req.params.status;

        const allowedStatus = ["ignore", "interested"];
        if(!allowedStatus.includes(status)){
            return res.status(400).json({message: "Invalid status type:" + status});
        }


        const toUser = await User.findById(toUserId);
        if(!toUser){
            return res.status(404).json({message: "User not found!!"});
        }

        // check if there is an existing Connectionrequest
        const existingConnectionRequest = await ConnectionRequestModel.findOne({
            $or: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ],
        }); 

        if(existingConnectionRequest){
            return res.status(400).send({message: "Connection request already exists!!"});
        }

        const connectionRequest = new ConnectionRequestModel({
            fromUserId,
            toUserId,
            status,
        });

        const data = await connectionRequest.save();

        const emailRes = await sendEmail.run(
            "New Connect Request from" + req.user.firstName,
            req.user.firstName + "is" + status + "in" + toUser.firstName
        );
        console.log("Email sent successfully!!", emailRes);

        res.json({
            message: req.user.firstName + "is" + status + "in" + toUser.firstName,
            data,
        })

    }catch(err){
        console.error(err);
        res.status(500).send("Error while sending connection request!!");
    }
});

requestRouter.post("/request/review/:status/:requestId", userAuth, async(req, res) => {
    try{

        const loggedInUser = req.user;
        const {status, requestId} = req.params;
        const allowedStatus = ["accepted", "rejected"];
        if(!allowedStatus.includes(status)){
            return res.status(400).json({message: "Invalid status type:" + status});
        }

        const connectionRequest = await ConnectionRequestModel.findOne({
            _id: requestId,
            toUserId: loggedInUser._id,
            status: "interested",
        });
        if(!connectionRequest){
            return res.status(404).json({message: "Connection request not found!!"});
        }

        connectionRequest.status = status;
        const data = await connectionRequest.save();

        res.json({
            message: "Connection request has been " + status + " by " + loggedInUser.firstName,
            data,
        });

    }catch(err){
        console.error(err);
        res.status(500).send("Error while reviewing connection request!!");
    }
})

module.exports = requestRouter;

