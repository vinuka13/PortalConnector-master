var express = require('express');
var axios = require('axios');
const {json} = require("express");
const fs = require('fs');
var convert = require('xml-js');
const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");
var router = express.Router();

router.post('/', async function (req, res, next) {
    try {
        console.log('Request body:');

        let name = req.query.name;
        let service = req.query.service;
        let serviceUrl = null;
        let xmlName = null;

        switch (service) {
            case 'invoice':
                serviceUrl = '/Custom/MIT/Common/Webservices/Invoices.xdo';
                xmlName = 'INVOICE_NUM';
                break;
            case 'grn':
                serviceUrl = '/Custom/MIT/Common/Webservices/PO.xdo';
                xmlName = 'PO_NO';
                break;
            case 'vendor':
                serviceUrl = '/Custom/MIT/Common/Webservices/Vendor.xdo';
                xmlName = 'VENDOR_NAME';
                break;
            default:
                throw new Exception('Invalid service');

        }

        const url = 'https://ehpw-test.fa.ap1.oraclecloud.com:443/xmlpserver/services/ExternalReportWSSService';
        var response = null;

        let xmls = '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">\n' +
            '    <soap:Header/>\n' +
            '    <soap:Body>\n' +
            '        <pub:runReport>\n' +
            '            <pub:reportRequest>\n' +
            '                <pub:attributeFormat></pub:attributeFormat>\n' +
            '                <pub:flattenXML></pub:flattenXML>\n' +
            '                <pub:parameterNameValues>\n' +
            '                    <pub:item>\n' +
            '                        <pub:name></pub:name>\n' +
            '                        <pub:values>\n' +
            '                            <pub:item></pub:item>\n' +
            '                        </pub:values>\n' +
            '                    </pub:item>\n' +
            '                </pub:parameterNameValues>\n' +
            '                <pub:reportAbsolutePath>'+serviceUrl+'</pub:reportAbsolutePath>\n' +
            '                <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>\n' +
            '            </pub:reportRequest>\n' +
            '        </pub:runReport>\n' +
            '    </soap:Body>\n' +
            '</soap:Envelope>';

        response = await axios.post(url, xmls, {
            headers: {'Content-Type': 'application/soap+xml; charset=utf-8'},
            auth: {
                username: 'Automation_Team',
                password: 'MIT@1234'
            }
        });

        const responseData = response.data;

        const parser = new XMLParser();
        const parsedResponse = parser.parse(responseData); // parse body xml

        let element = parsedResponse['env:Envelope']['env:Body']['ns2:runReportResponse']['ns2:runReportReturn']['ns2:reportBytes'];

        let resp = Buffer.from(element, "base64").toString("utf-8");
        let result = parser.parse(resp);
        result = result['DATA_DS']['G_1'];

        for (const resultKey in result) {
            if (result.hasOwnProperty(resultKey)) {
                const resultElement = result[resultKey];
                if (resultElement[xmlName] === name) {
                    result = resultElement;
                    break;
                }
            }
        }

        console.log(result);
        res.json(result);
    } catch (error) {
        console.error('Error sending data to third-party API:', error);
        res.status(500).json(error);
    }
});


module.exports = router;