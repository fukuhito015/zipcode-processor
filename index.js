require('dotenv').config();
require('date-utils');
const request = require('request');
const unzip = require('unzip');
const fs = require('fs');
const iconv = require('iconv-lite');
const readline = require('readline');
const { Converter } = require('csvtojson');
const aws = require('aws-sdk');

const converter = new Converter({ noheader: true });
const s3 = new aws.S3({
  region: 'ap-northeast-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});
const isAllUpload = process.env.IS_ALL_UPLOAD === '1';

const url = 'https://www.post.japanpost.jp/zipcode/dl/oogaki/zip/ken_all.zip';
const zipCodes = [];
const changeZipCodes = [];

async function processZipcodes() {
  try {
    const ZIP_FILE_PATH = '/tmp/zipcode.zip'
    await downloadZipFile(url, ZIP_FILE_PATH);
    await unzipFile(ZIP_FILE_PATH, '/tmp');
    await convertCsvToJson('/tmp/KEN_ALL.CSV', '/tmp/tmp.json');
    await parseJsonFile('/tmp/tmp.json');
    const dedupeCodes = dedupeZipCodes(zipCodes, changeZipCodes, isAllUpload);
    await uploadToS3(dedupeCodes);
    console.log('Success Creating zipcode.json');
  } catch (error) {
    console.error(error);
  }
}

function downloadZipFile(url, dest) {
  return new Promise((resolve, reject) => {
    request(url)
      .pipe(fs.createWriteStream(dest))
      .on('finish', resolve)
      .on('error', reject);
  });
}

function unzipFile(src, dest) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(src)
      .pipe(unzip.Parse())
      .on('entry', (entry) => {
        const filePath = `${dest}/${entry.path}`;
        entry.pipe(fs.createWriteStream(filePath)).on('finish', resolve).on('error', reject);
      })
      .on('error', reject);
  });
}

function convertCsvToJson(src, dest) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(src)
      .pipe(iconv.decodeStream('SJIS'))
      .pipe(iconv.encodeStream('UTF-8'))
      .pipe(converter)
      .pipe(fs.createWriteStream(dest))
      .on('finish', resolve)
      .on('error', reject);
  });
}

function parseJsonFile(src) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(src);
    const rl = readline.createInterface(stream, {});
    rl.on('line', (line) => {
      const l = JSON.parse(line);
      const code = {
        zipcode: l.field3,
        prefecture_kana: l.field4,
        city_kana: l.field5,
        other_address_kana: l.field6.replace(/\(.*\)/g, ''),
        prefecture: l.field7,
        city: l.field8,
        other_address: l.field9.replace(/（.*）/g, ''),
        is_change: l.field14,
      };
      if (code.other_address !== '以下に掲載がない場合') {
        zipCodes.push(code);
        if (code.is_change === '1') {
          changeZipCodes.push(code.zipcode);
        }
      }
    });
    rl.on('close', resolve);
    rl.on('error', reject);
  });
}

function dedupeZipCodes(zipCodes, changeZipCodes, isAllUpload) {
  if (isAllUpload) {
    return Array.from(new Set(zipCodes.map((c) => c.zipcode)));
  } else {
    fs.writeFileSync(`./tmp/${new Date().toFormat('YYYY-MM-DD')}.txt`, changeZipCodes);
    return changeZipCodes;
  }
}

async function uploadToS3(dedupeCodes) {
  const codes = dedupeCodes.map((zipcode) => ({
    key: zipcode,
    values: zipCodes.filter((c) => c.zipcode === zipcode),
  }));

  const uploadPromises = codes.map((code) => {
    const firstHalf = code.key.slice(0, 3);
    const latterHalf = code.key.slice(3, 7);
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${firstHalf}/${latterHalf}.json`,
      Body: JSON.stringify(code.values),
    };
    return s3.putObject(params).promise();
  });

  await Promise.all(uploadPromises);
}

processZipcodes();
