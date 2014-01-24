using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;

namespace ConsoleHttpPost {
    class ConfigPOST {

        public string Base64FileName { get; set; }

        internal static ConfigPOST getConfigPOST() {
            var config = new ConfigPOST();
            //check for config file, load if exsists, 
            //if not load defaults

            config.PostTimes = 1;
            //string loadFileName = @"E:\VA\VLERDoc.xml";
            //string loadFileName = @"E:\Code\GitHub\vlerdas-ecrud\test\attachments\eCFT1MBAttachEmbeded.xml";
            //string loadFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_5MB_a.xml"; //6.8 MB
            //string loadFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_14MB_a.xml"; //19.1 MB
            //string loadFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_17MB_a.xml"; //23.2 MB
            //string loadFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_21MB_a.xml"; //28.7 MB
            //string loadFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_25MB_a.xml"; //34.2 MB
            //config.Base64FileName = @"F:\Dev Tools\mongodbWin32_64.zip.b64.txt"; //138 MB
            config.Base64FileName = @"F:\Dev Tools\SnippetManager.b64.txt"; //zip file 507 KB
            //config.Base64FileName = @"C:\vler-proto-out\generated_out\xmlAttachment-Over1MB.xml.b64"; //1.33 MB

            config.StringURL = "http://localhost:3001/ecrud/v1/core/electronicCaseFiles/transform";
            //config.StringURL = "http://das.dynalias.org:8080/ecrud/v1/core/electronicCaseFiles/transform";
            //for HTTPS
            //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/electronicCaseFiles/transform";
            //config.StringURL = "https://silvervler.va.gov/ecrud/v1/core/electronicCaseFiles/transform";
            //config.StringURL = "https://silvervler.va.gov/ecrud/v1/core/electronicCaseFiles/transform?batchComplete=true&moroni=true";
            //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/electronicCaseFiles/transform?batchComplete=true&moroni=true";
            
            config.DocTitle = "LargeAttachmentTitle-MoroniApp";
            config.AttachmentDescription = "Mongodb zip file";
            config.AttachmentFormatName = "application/zip";

            config.PathToKey = @"E:\VA\2waySSL\clientcert.pkcs12";
            config.KeyPassword = "keypass";
            //POSTRequest.ClientCertificates.Add(new X509Certificate(@"F:\Downloads\ides-cftdeom.asmr.com.cer", "test123"));
            //POSTRequest.ClientCertificates.Add(new X509Certificate(@"E:\VA\DoDCerts\dodRootCA2.cer"));
            //POSTRequest.ClientCertificates.Add(new X509Certificate(@"E:\VA\DoDCerts\DODJITCCA-27.crt"));
            //POSTRequest.ClientCertificates.Add(new X509Certificate(@"E:\VA\DoDCerts\ides-cftdemo.asmr.com.crt"));

            config.ClientTimeout = 600000; //10 Min

            //save config to file
            return config;
        }

        public string DocTitle { get; set; }

        public string AttachmentDescription { get; set; }

        public string AttachmentFormatName { get; set; }

        public string StringURL { get; set; }

        public int PostTimes { get; set; }

        public string PathToKey { get; set; }

        public string KeyPassword { get; set; }

        public int ClientTimeout { get; set; }

        internal string getAttachmentFileName() {
            return Path.GetFileName(this.Base64FileName);
        }
    }
}
