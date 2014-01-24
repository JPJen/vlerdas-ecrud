using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.IO;
using System.Globalization;
using System.Security.Cryptography.X509Certificates;
using System.Diagnostics;

namespace ConsoleHttpPost {
    class Program {
        static void Main(string[] args) {

            ConfigPOST config = ConfigPOST.getConfigPOST();
            NiemXML niemXML = new NiemXML();
            StringBuilder sb = new StringBuilder();
            sb.Append(niemXML.getBeforeBase64(config.DocTitle));
            string attachmentStr = File.ReadAllText(config.Base64FileName, Encoding.UTF8);
            sb.Append(attachmentStr);
            sb.Append(niemXML.getAfterBase64(attachmentStr.Length, config.AttachmentDescription, 
                                                config.AttachmentFormatName, config.getAttachmentFileName()));
            attachmentStr = null;
            byte[] xmlData = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
            File.AppendAllText(config.getAttachmentFileName() + "(whole).xml", sb.ToString());
            if (args.Length > 0)
                config.StringURL = args[0];
            logFileName = "ConsolePOST_" + DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss") + ".log";
            double byteLen = xmlData.Length;
            printLine("POSTing " + Math.Round(byteLen / 1024 / 1024, 2) + " MB (total) to:");
            printLine(config.StringURL + Environment.NewLine);
            doMultiPartPOSTs(xmlData, config);
            Console.In.Read();
        }

        private static void doMultiPartPOSTs(byte[] xmlData, ConfigPOST config) {
            int postCount = 0;
            while (postCount < config.PostTimes) {
                printLine(DateTime.Now.ToString());
                Stopwatch stopWatch = new Stopwatch();
                postCount++;
                try {
                    HttpWebRequest POSTRequest = (HttpWebRequest)WebRequest.Create(config.StringURL);
                    //For HTTPS two way cert, must be imported to "Trusted Root Certificate Authorities", Location: IE > Tools > Internet Options > Content > Certificates
                    POSTRequest.ClientCertificates.Add(new X509Certificate(config.PathToKey, config.KeyPassword)); // ours/CACI
                    //End HTTPS
                    POSTRequest.Method = "POST";
                    POSTRequest.KeepAlive = false;
                    POSTRequest.Timeout = config.ClientTimeout;
                    //Content length of message body
                    POSTRequest.Accept = "application/xml";

                    var boundary = "---------------------------" + DateTime.Now.Ticks.ToString("x", NumberFormatInfo.InvariantInfo);
                    POSTRequest.ContentType = "multipart/form-data; boundary=" + boundary;
                    boundary = "--" + boundary;

                    stopWatch.Start();
                    using (var requestStream = POSTRequest.GetRequestStream()) {
                        var buffer = Encoding.ASCII.GetBytes(boundary + Environment.NewLine);
                        requestStream.Write(buffer, 0, buffer.Length);
                        buffer = Encoding.UTF8.GetBytes(string.Format("Content-Disposition: form-data; name=\"{0}\"; filename=\"{1}\"{2}", "file", 
                                                            config.getAttachmentFileName(), Environment.NewLine));
                        requestStream.Write(buffer, 0, buffer.Length);
                        buffer = Encoding.ASCII.GetBytes(string.Format("Content-Type: {0}{1}{1}", "text/xml", Environment.NewLine));
                        requestStream.Write(buffer, 0, buffer.Length);

                        requestStream.Write(xmlData, 0, xmlData.Length);

                        buffer = Encoding.ASCII.GetBytes(Environment.NewLine);
                        requestStream.Write(buffer, 0, buffer.Length);

                        var boundaryBuffer = Encoding.ASCII.GetBytes(boundary + "--");
                        requestStream.Write(boundaryBuffer, 0, boundaryBuffer.Length);
                    }

                    HttpWebResponse POSTResponse = (HttpWebResponse)POSTRequest.GetResponse();
                    StreamReader reader = new StreamReader(POSTResponse.GetResponseStream(), Encoding.UTF8);
                    string daLocation = POSTResponse.GetResponseHeader("Location");
                    HttpStatusCode daStatusCode = POSTResponse.StatusCode;

                    string ResponseFromPost = reader.ReadToEnd().ToString();
                    printLine("StatusCode: " + daStatusCode);

                    if (daStatusCode == HttpStatusCode.Accepted ||
                        daStatusCode == HttpStatusCode.Created ||
                        daStatusCode == HttpStatusCode.OK) {
                        printLine(ResponseFromPost);
                    }
                } catch (WebException we) {
                    String errMsg = we.Message;
                    if (we.Response != null)
                        errMsg += "; " + new StreamReader(we.Response.GetResponseStream(), Encoding.UTF8).ReadToEnd().ToString();
                    printLine(errMsg);
                }
                stopWatch.Stop();
                TimeSpan ts = stopWatch.Elapsed;
                string elapsedTime = String.Format("{0:00}:{1:00}:{2:00}.{3:00}",
                                                        ts.Hours, ts.Minutes, ts.Seconds,
                                                        ts.Milliseconds / 10);
                printLine("Elapsed Time: " + elapsedTime);
                printLine("POST Count: " + postCount + Environment.NewLine);
            }
        }

        static string logFileName = "ConsolePOST.log";

        private static void printLine(String msg) {
            System.Diagnostics.Debug.WriteLine(msg);
            Console.WriteLine(msg);
            File.AppendAllText(logFileName, msg + Environment.NewLine);
        }
    }
}
