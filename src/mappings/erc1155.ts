import { Address, BigInt, store } from "@graphprotocol/graph-ts";
import {
  TransferSingle,
  TransferBatch,
  URI,
  ERC1155,
} from "../../generated/ERC1155/ERC1155";
import { Nft, NftContract, Owner } from "../../generated/schema";
import {
  BIG_INT_ZERO,
  BIG_INT_ONE,
  ZERO_ADDRESS_STRING,
  ERC_165_IDENTIFIER,
  ERC_721_IDENTIFIER,
  ERC_721_METADATA_IDENTIFIER,
  NULL_IDENTIFIER,
} from "./constants";
import { supportsInterface, normalize } from "./utils";

export function handleTransferSingle(event: TransferSingle): void {
  transferBase(
    event.address,
    event.params._from,
    event.params._to,
    event.params._id,
    event.params._value,
    event.block.timestamp
  );
}

export function handleTransferBatch(event: TransferBatch): void {
  if (event.params._ids.length != event.params._values.length) {
    throw new Error("Inconsistent arrays length in TransferBatch");
  }

  for (let i = 0; i < event.params._ids.length; i++) {
    let ids = event.params._ids;
    let values = event.params._values;
    transferBase(
      event.address,
      event.params._from,
      event.params._to,
      ids[i],
      values[i],
      event.block.timestamp
    );
  }
}

export function handleURI(event: URI): void {
  let id = event.address.toHexString() + "/" + event.params._id.toString();
  let nft = Nft.load(id);
  if (nft != null) {
    nft.tokenURI = event.params._value;
    nft.save();
  }
}

function transferBase(
  contractAddress: Address,
  from: Address,
  to: Address,
  id: BigInt,
  value: BigInt,
  timestamp: BigInt
): void {
  let nftId = contractAddress.toHexString() + "/" + id.toString();
  let nft = Nft.load(nftId);
  if (nft == null) {
    let contract = ERC1155.bind(contractAddress);
    nft = new Nft(nftId);
    nft.contract = contractAddress.toHexString();
    nft.tokenID = id;
    nft.creatorAddress = contract.creators(id);
    nft.tokenURI = contract.uri(id);
    nft.createdAt = timestamp;
    nft.save();
  }

  if (to == ZERO_ADDRESS) {
    // burn token
    nft.removedAt = timestamp;
    nft.save();
  }

  if (from != ZERO_ADDRESS) {
    updateOwnership(nftId, from, BIGINT_ZERO.minus(value));
  }
  updateOwnership(nftId, to, value);
}
