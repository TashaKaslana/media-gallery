import {
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../core/s3_client.js";
import type { S3StorageItem } from "../types/types.js";

const STORAGE_CUSTOM_DOMAIN = process.env.STORAGE_CUSTOM_DOMAIN;
const preSignedUrlR2Format = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

export async function uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
) {
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    );
}

export async function createUploadUrl(
    key: string,
    contentType: string,
) {
    const expireDuration = 60 * 5

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(s3, command, {
        expiresIn: expireDuration,
    });
}

export const createDownloadUrl = async (
    key: string
): Promise<string> => {
    const expireDuration = 60 * 5

    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    })

    const url = await getSignedUrl(
        s3,
        command, {
            expiresIn: expireDuration
        }
    )

    const replacedUrl = replaceR2UrlWithCustomDomain(url)
    return replacedUrl
}

export const deleteStorageItem = async (
    key: string
) => {
    const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    })

    await s3.send(command)
}

export const getStorageList = async (keyList: string[]): Promise<S3StorageItem[]> => {
    if (keyList.length === 0) {
        return [];
    }

    const expireDuration = 60 * 5

    const keysRetrivalCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
    })

    const objects = (await s3.send(keysRetrivalCommand)).Contents

    if (!objects) {
        return []
    }

    const matchingObjects = objects.filter(obj => obj.Key !== undefined && keyList.includes(obj.Key))


    return await Promise.all(
        matchingObjects.map(async (object) => {
            const key = object.Key!;

            const preSignedCommand = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key
            })

            const url = await getSignedUrl(
                s3,
                preSignedCommand, {
                expiresIn: expireDuration
            })

            const replacedUrl = replaceR2UrlWithCustomDomain(url)

            const storageItem: S3StorageItem = {
                key: key,
                url: replacedUrl
            }

            if (object.Size !== undefined) {
                storageItem.size = object.Size
            }

            if (object.LastModified !== undefined) {
                storageItem.lastModifiedAt = object.LastModified
            }

            return storageItem
        })
    )
}

const replaceR2UrlWithCustomDomain = (url: string): string => {
    let customDomain = STORAGE_CUSTOM_DOMAIN

    if (!customDomain) {
        return url;
    }

    if (!customDomain.startsWith("http://") && !customDomain.startsWith("https://")) {
        console.warn(`STORAGE_CUSTOM_DOMAIN does not start with http:// or https://. Prepending https:// to the domain.`);
        customDomain = `https://${customDomain}`;
    }

    if (!url.startsWith(preSignedUrlR2Format)) {
        return url;
    }

    return url.replace(preSignedUrlR2Format, customDomain);
}
