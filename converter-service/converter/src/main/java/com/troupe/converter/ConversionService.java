package com.troupe.converter;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.ConnectException;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import org.springframework.stereotype.Component;

import com.artofsolving.jodconverter.DefaultDocumentFormatRegistry;
import com.artofsolving.jodconverter.DocumentFormat;
import com.artofsolving.jodconverter.DocumentFormatRegistry;
import com.artofsolving.jodconverter.openoffice.connection.SocketOpenOfficeConnection;
import com.artofsolving.jodconverter.openoffice.converter.StreamOpenOfficeDocumentConverter;

@Component
public class ConversionService {

	private SocketOpenOfficeConnection connection;
	private DocumentFormatRegistry registry;
	private DocumentFormat defaultOutputFormat;

	@PostConstruct
	public void construct() throws ConnectException {
		connection = new SocketOpenOfficeConnection(8100);
		registry = new  DefaultDocumentFormatRegistry();
		
		defaultOutputFormat = registry.getFormatByFileExtension("pdf");
				
		connection.connect();
	}
	
	@PreDestroy
	public void preDestroy() {
		connection.disconnect();
	}
	
	public void convert(InputStream inputStream, String mimeType, OutputStream outputStream) {
		StreamOpenOfficeDocumentConverter converter = new StreamOpenOfficeDocumentConverter(connection);
		DocumentFormat inputFormat = registry.getFormatByMimeType(mimeType);
		
		converter.convert(inputStream, inputFormat, outputStream, defaultOutputFormat);
	}
	
}
