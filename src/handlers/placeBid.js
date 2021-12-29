import AWS from 'aws-sdk';
import createError from 'http-errors';
import validator from '@middy/validator';
import commonMiddleware from '../lib/commonMiddleware';
import placeBidSchema from '../lib/schemas/placeBidSchema';
import { getAuctionById } from './getAuction'

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);
  
  if (auction.status !== 'OPEN') {
    throw new createError.Forbidden('You cannot bid on closed auctions.')
  }

  if (amount <= auction.highestBid.amount) {
    throw new createError.Forbidden(`Your bid should be higher than ${auction.highestBid.amount}`)
  }
  
  if (email === auction.seller) {
    throw new createError.Forbidden(`Youcannot bid on your own auction.`)
  }
  
  if (email === auction.highestBid.bidder) {
    throw new createError.Forbidden('You are the current highest bidder, you cannot bid.')
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: 'set highestBid.amount = :amount, highestBid.bidder = :bidder',
    ExpressionAttributeValues: {
      ':amount': amount,
      ':bidder': email,
    },
    ReturnValues: 'ALL_NEW',
  };

  let updatedAuction;

  try {
    const result = await dynamodb.update(params).promise()
    updatedAuction = result.Attributes;
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error); // only for local debugging, for prod have status code
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = commonMiddleware(placeBid)
  .use(validator({
    inputSchema: placeBidSchema
  }));
