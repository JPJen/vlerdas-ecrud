package ecrud.example;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URL;

import org.apache.commons.io.FileUtils;
import org.apache.cxf.jaxrs.client.WebClient;
import org.apache.cxf.jaxrs.ext.multipart.AttachmentBuilder;
import org.apache.cxf.jaxrs.ext.multipart.ContentDisposition;
import org.apache.cxf.jaxrs.ext.multipart.MultipartBody;

public class TransformPOST {

	public static void main(String[] args) {
		ClassLoader classloader = Thread.currentThread().getContextClassLoader();
		URL url = classloader.getResource("VLERDoc-UTF8.xml");
		InputStream is = classloader.getResourceAsStream("VLERDoc-UTF8.xml");

		File file = new File(url.getPath());
		try {
			String message = FileUtils.readFileToString(file, "UTF-8");
		
			postStreamToGridFS_WebClient(is, file.getName());
			System.out.println("Stream posted \n\n");
			
			postStringToGridFS_WebClient(message, file.getName());
			System.out.println("String posted \n\n");

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	static String localURL = "http://localhost:3001/ecrud/v1/core/electronicCaseFiles/transform";
	
	static String postStringToGridFS_WebClient(String message, String filename) throws UnsupportedEncodingException {
		InputStream inStream = new ByteArrayInputStream(message.getBytes("UTF-8"));
        return postStreamToGridFS_WebClient(inStream, filename);
	}
	
	static String postStreamToGridFS_WebClient(InputStream inStream, String filename) throws UnsupportedEncodingException {

        //connect to CRUD
        WebClient client = WebClient.create(localURL);
        client.type("multipart/form-data");
        client.accept("application/xml");
        ContentDisposition cd = new ContentDisposition("attachment;name=\"file\";filename=\""+filename+"\"");
        AttachmentBuilder ab = new AttachmentBuilder();
        ab.contentDisposition(cd);
        ab.mediaType("application/xml");
        ab.object(inStream);
      
        javax.ws.rs.core.Response r = client.post(new MultipartBody(ab.build()));

        String response = r.getStatus() + ": " + r.readEntity(String.class);
        //String response = r.getStatus() + ": " + r.toString();
        System.out.println("WS CXF client response: [" + response + "]");
        return response;

    }

}
